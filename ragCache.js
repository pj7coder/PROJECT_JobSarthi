/**
 * ============================================================
 * RAG CACHE ENGINE — JobSarthi  (v2 — Improved)
 * ============================================================
 *
 * WHAT IS RAG?
 * Retrieval-Augmented Generation (RAG) is a technique that:
 *   1. Converts documents into semantic embedding vectors
 *   2. Stores them in a vector database (MemoryVectorStore)
 *   3. At query time, converts the query to a vector too
 *   4. Finds documents whose vectors are closest (cosine similarity)
 *   5. Feeds only those relevant snippets to the LLM
 *
 * WHY? The LLM gets focused, relevant context instead of the
 * entire document. This saves tokens (= money), reduces
 * hallucination, and produces better structured responses.
 *
 * ────────────────────────────────────────────────────────────
 * CACHES IN THIS MODULE (4 total in v2):
 *
 *  1. RESUME ANALYSIS CACHE  (SHA-256 of rawText + targetRole)
 *     → Skip ALL LLM calls if same resume already analysed.
 *     → TTL: 24 h | LRU cap: 200 entries
 *
 *  2. JD VECTOR STORE CACHE  (SHA-256 of JD text)
 *     → Re-use existing MemoryVectorStore if same JD appears
 *       again (multiple interviews or applicants against same JD).
 *     → TTL: 12 h | LRU cap: 100 entries
 *
 *  3. INTERVIEW CONTEXT CACHE  (SHA-256 of role + difficulty)
 *     → Cache question sets and scoring rubrics per role.
 *     → Avoids re-generating question banks for same interview type.
 *     → TTL: 6 h | LRU cap: 50 entries
 *
 *  4. JOB SEMANTIC SEARCH INDEX
 *     → Pre-embed up to 3000 active jobs on server boot.
 *     → Natural language query → cosine similarity ranking.
 *     → Refresh every 6 h in background.
 * ============================================================
 */

import crypto from "crypto";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────
const RESUME_CACHE_TTL_MS   = 24 * 60 * 60 * 1000;   // 24 hours
const JD_CACHE_TTL_MS       = 12 * 60 * 60 * 1000;   // 12 hours
const INTERVIEW_CACHE_TTL_MS =  6 * 60 * 60 * 1000;  //  6 hours
const JOB_INDEX_TTL_MS      =  6 * 60 * 60 * 1000;   //  6 hours
const MAX_RESUME_CACHE       = 200;
const MAX_JD_CACHE           = 100;
const MAX_INTERVIEW_CACHE    = 50;
const EMBEDDING_MODEL        = "gemini-embedding-001"; // 3072-dim, Google

// Splitter configs: v2 uses slightly larger chunks + more overlap
// for better context preservation in resume sections
const RESUME_CHUNK_SIZE = 400;   // was 280 — captures whole experience bullets
const RESUME_CHUNK_OVERLAP = 60; // was 30  — prevents boundary cut-offs
const JD_CHUNK_SIZE     = 300;   // was 280
const JD_CHUNK_OVERLAP  = 40;    // was 30

// Minimum cosine similarity to count as a meaningful alignment
const MIN_ALIGNMENT_SCORE = 0.28; // was 0.25 — slightly stricter to reduce noise

// ─────────────────────────────────────────────
// SHARED SINGLETON EMBEDDER
// One GoogleGenerativeAIEmbeddings instance per server process.
// Lazy-initialised on first use.
// ─────────────────────────────────────────────
let _embeddings = null;
export function getEmbeddings(apiKey) {
  if (!_embeddings) {
    if (!apiKey && !process.env.GEMINI_API_KEY) {
      throw new Error("[RAG] GEMINI_API_KEY is not set. Cannot initialise embeddings.");
    }
    _embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
      modelName: EMBEDDING_MODEL,
    });
    console.log("[RAG] Embeddings singleton initialised:", EMBEDDING_MODEL);
  }
  return _embeddings;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function sha256(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function now() { return Date.now(); }

// LRU eviction — removes the oldest entry when map exceeds limit
function lruEvict(map, limit) {
  if (map.size <= limit) return;
  // Sort by timestamp ascending, delete oldest
  const oldest = [...map.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
  if (oldest) {
    map.delete(oldest[0]);
    console.log(`[Cache] LRU evicted oldest entry.`);
  }
}

// ─────────────────────────────────────────────────────────────
// 1. RESUME ANALYSIS CACHE
//
// HOW IT WORKS:
//   • When a resume is submitted → Gemini extracts rawText.
//   • We hash(rawText + targetRole) → look up in Map.
//   • HIT: return cached analysis immediately. Zero LLM calls.
//   • MISS: let pipeline run → store result → next call is a HIT.
//
// WHY SHA-256:
//   • Same bytes of content → identical hash → instant lookup.
//   • Even a 1-character change in the resume produces a totally
//     different hash, so we never serve stale data.
// ─────────────────────────────────────────────────────────────
const resumeCache = new Map();

export function getResumeCache(rawText, targetRole = "") {
  const key = sha256(rawText + "|" + targetRole.toLowerCase().trim());
  const entry = resumeCache.get(key);
  if (!entry) return null;
  if (now() - entry.ts > RESUME_CACHE_TTL_MS) {
    resumeCache.delete(key);
    return null;
  }
  entry.ts = now(); // refresh on hit (keeps hot entries alive)
  console.log(`[ResumeCache] HIT — ${key.slice(0, 12)}… saved LLM call.`);
  return entry.data;
}

export function setResumeCache(rawText, targetRole = "", data) {
  const key = sha256(rawText + "|" + targetRole.toLowerCase().trim());
  lruEvict(resumeCache, MAX_RESUME_CACHE);
  resumeCache.set(key, { ts: now(), data });
  console.log(`[ResumeCache] STORED — ${key.slice(0, 12)}… (${resumeCache.size}/${MAX_RESUME_CACHE} entries)`);
}

export function getResumeCacheStats() {
  return {
    entries: resumeCache.size,
    maxEntries: MAX_RESUME_CACHE,
    ttlHours: RESUME_CACHE_TTL_MS / 3600000,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. JD VECTOR STORE CACHE
//
// HOW IT WORKS:
//   • A job description (JD) is split into semantic chunks (300
//     chars each, 40 char overlap).
//   • Each chunk is converted to a 3072-dimensional vector via
//     Google's gemini-embedding-001 model.
//   • These vectors are stored in a MemoryVectorStore.
//   • Cache key = SHA-256 of JD text.
//   • If recruiter runs 5 interviews with the same JD → cache HIT
//     on attempts 2-5. We skip re-embedding (saves API calls).
//
// IMPROVEMENT (v2):
//   • Larger chunks (300→300 char, 30→40 overlap) for better
//     semantic coherence per chunk.
//   • Validates chunks have meaningful content before embedding.
// ─────────────────────────────────────────────────────────────
const jdVectorCache = new Map();

export async function getOrBuildJDVectorStore(jdText, apiKey) {
  if (!jdText || jdText.trim().length < 20) {
    console.warn("[JDCache] JD text too short to build a vector store.");
    return null;
  }

  const key = sha256(jdText);
  const entry = jdVectorCache.get(key);
  if (entry && now() - entry.ts < JD_CACHE_TTL_MS) {
    console.log(`[JDCache] HIT — ${key.slice(0, 12)}… Reusing VectorStore (${entry.chunkCount} chunks).`);
    return entry.store;
  }

  console.log(`[JDCache] MISS — building VectorStore for JD (${jdText.length} chars)...`);
  const embeddings = getEmbeddings(apiKey);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: JD_CHUNK_SIZE,
    chunkOverlap: JD_CHUNK_OVERLAP,
  });

  const rawDocs = await splitter.createDocuments([jdText]);
  // Filter out chunks that are mostly whitespace
  const docs = rawDocs.filter(d => d.pageContent.trim().length > 30);

  const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
  lruEvict(jdVectorCache, MAX_JD_CACHE);
  jdVectorCache.set(key, { ts: now(), store, chunkCount: docs.length });
  console.log(`[JDCache] STORED — ${key.slice(0, 12)}… (${docs.length} chunks embedded)`);
  return store;
}

// ─────────────────────────────────────────────────────────────
// 3. INTERVIEW CONTEXT CACHE
//
// HOW IT WORKS:
//   • Stores pre-generated question banks, scoring rubrics,
//     and domain knowledge per interview role+difficulty.
//   • Key = SHA-256 of (role + difficulty).
//   • First interview for "Frontend Developer | Hard" → build +
//     store context. All subsequent identical interviews → HIT.
// ─────────────────────────────────────────────────────────────
const interviewContextCache = new Map();

export function getInterviewContext(role, difficulty) {
  const key = sha256(`${role}|${difficulty}`);
  const entry = interviewContextCache.get(key);
  if (!entry) return null;
  if (now() - entry.ts > INTERVIEW_CACHE_TTL_MS) {
    interviewContextCache.delete(key);
    return null;
  }
  entry.ts = now();
  console.log(`[InterviewCache] HIT — role: "${role}", difficulty: "${difficulty}"`);
  return entry.data;
}

export function setInterviewContext(role, difficulty, data) {
  const key = sha256(`${role}|${difficulty}`);
  lruEvict(interviewContextCache, MAX_INTERVIEW_CACHE);
  interviewContextCache.set(key, { ts: now(), data });
  console.log(`[InterviewCache] STORED — role: "${role}", difficulty: "${difficulty}"`);
}

// ─────────────────────────────────────────────────────────────
// 4. JOB SEMANTIC SEARCH INDEX
//
// HOW IT WORKS:
//   • On server boot, up to 3000 active jobs are embedded.
//   • Each job → one document: title + skills + description[200]
//   • Stored in a single MemoryVectorStore.
//   • When user searches "machine learning intern remote" → we
//     embed that query → find the K most similar job vectors.
//   • Returns jobIds + semantic similarity scores (0-100%).
//
// IMPROVEMENT (v2):
//   • Richer document content: adds salary range, job type,
//     experience level to the embedded text → better matches.
//   • Tracks build progress percentage.
//   • Returns semanticScore properly normalized.
// ─────────────────────────────────────────────────────────────
let jobSearchIndex = null;
let jobIndexBuildTime = 0;
let jobIndexBuilding = false;
let jobIndexTotal = 0;

export async function buildJobSearchIndex(jobs, apiKey) {
  if (jobIndexBuilding) {
    console.log("[JobIndex] Build already in progress, skipping duplicate call.");
    return;
  }
  if (jobSearchIndex && now() - jobIndexBuildTime < JOB_INDEX_TTL_MS) {
    console.log(`[JobIndex] Index is fresh (${jobIndexTotal} jobs, built ${Math.round((now()-jobIndexBuildTime)/60000)}m ago). Skipping rebuild.`);
    return;
  }

  jobIndexBuilding = true;
  const startTime = now();
  console.log(`[JobIndex] Starting semantic index build for ${jobs.length} jobs...`);

  try {
    const embeddings = getEmbeddings(apiKey);

    // ── v2: Richer document content for better query matching ──
    const sample = jobs
      .filter(j => j.status !== "closed")
      .slice(0, 3000);

    const docs = sample.map(job => {
      // Build enriched document text
      const skillsText = Array.isArray(job.skills)
        ? job.skills.join(", ")
        : (job.skills || "");
      const content = [
        job.title || "",
        skillsText,
        job.company || "",
        job.location || "",
        job.type || "",
        (job.description || "").slice(0, 250),   // slightly more than v1
        job.salary ? `Salary: ${job.salary}` : "",
      ].filter(Boolean).join(". ");

      return {
        pageContent: content,
        metadata: {
          jobId:    String(job.id || job._id || ""),
          title:    job.title || "",
          company:  job.company || "",
          location: job.location || "",
          type:     job.type || "",
          salary:   job.salary || "",
        },
      };
    });

    // Embed in batches of 100 to avoid rate-limit bursts
    const BATCH_SIZE = 100;
    let store = null;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      if (!store) {
        store = await MemoryVectorStore.fromDocuments(batch, embeddings);
      } else {
        await store.addDocuments(batch);
      }
      const pct = Math.round(((i + BATCH_SIZE) / docs.length) * 100);
      process.stdout.write(`\r[JobIndex] Embedding… ${Math.min(i + BATCH_SIZE, docs.length)}/${docs.length} (${Math.min(pct,100)}%)`);
    }
    process.stdout.write("\n");

    jobSearchIndex = store;
    jobIndexBuildTime = now();
    jobIndexTotal = sample.length;
    const elapsed = ((now() - startTime) / 1000).toFixed(1);
    console.log(`[JobIndex] ✓ Index built in ${elapsed}s — ${jobIndexTotal} jobs indexed.`);
  } catch (err) {
    console.error("[JobIndex] Failed to build index:", err.message);
  } finally {
    jobIndexBuilding = false;
  }
}

/**
 * semanticJobSearch
 * Converts a natural-language query into a vector and returns
 * the topK most semantically similar jobs with their scores.
 *
 * Returns null if index isn't ready (caller should fall back to
 * keyword search in that case).
 */
export async function semanticJobSearch(query, topK = 20, apiKey) {
  if (!jobSearchIndex) {
    console.warn("[JobIndex] Index not ready — falling back to keyword search.");
    return null;
  }
  try {
    // ── v2: Expand query with common synonyms for better recall ──
    const expandedQuery = expandSearchQuery(query);
    const results = await jobSearchIndex.similaritySearchWithScore(expandedQuery, topK);
    // scores are cosine distances in LangChain MemoryVectorStore (lower = better match)
    // We invert and scale to 0-100 for a human-readable score
    return results.map(([doc, score]) => ({
      jobId:         doc.metadata.jobId,
      title:         doc.metadata.title,
      company:       doc.metadata.company,
      location:      doc.metadata.location,
      type:          doc.metadata.type,
      semanticScore: Math.round((1 - score) * 100),
    }));
  } catch (err) {
    console.error("[JobIndex] Semantic search error:", err.message);
    return null;
  }
}

/**
 * expandSearchQuery
 * Adds common synonyms/abbreviations so the embedding captures
 * more intent. E.g. "ML" → "machine learning ML" so both the
 * abbreviation and full term contribute to the query vector.
 */
function expandSearchQuery(query) {
  const expansions = {
    "ml": "machine learning ml",
    "ai": "artificial intelligence ai",
    "js": "javascript js",
    "ts": "typescript ts",
    "fe": "frontend fe",
    "be": "backend be",
    "fs": "fullstack full stack fs",
    "ux": "user experience ux design",
    "swe": "software engineer swe",
    "sde": "software development engineer sde",
    "k8s": "kubernetes k8s",
    "aws": "amazon web services aws cloud",
    "gcp": "google cloud platform gcp",
    "devops": "devops ci/cd deployment",
    "qa": "quality assurance qa testing",
  };
  const q = query.toLowerCase().trim();
  return expansions[q] || Object.entries(expansions).reduce((acc, [abbr, full]) => {
    return acc.replace(new RegExp(`\\b${abbr}\\b`, "gi"), full);
  }, q);
}

export function isJobIndexReady() {
  return !!jobSearchIndex;
}

export function getJobIndexStats() {
  return {
    ready:          !!jobSearchIndex,
    totalJobs:      jobIndexTotal,
    isBuilding:     jobIndexBuilding,
    lastBuilt:      jobIndexBuildTime ? new Date(jobIndexBuildTime).toISOString() : null,
    ttlRemainingMs: jobIndexBuildTime
      ? Math.max(0, JOB_INDEX_TTL_MS - (now() - jobIndexBuildTime))
      : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// RESUME ↔ JD ALIGNMENT  (Core RAG Pipeline)
//
// HOW IT WORKS (step by step):
//
//  1. JD is chunked (300 chars, 40 overlap) → embedded → stored
//     in a MemoryVectorStore (cached via getOrBuildJDVectorStore).
//
//  2. Resume rawText is chunked (400 chars, 60 overlap) → each
//     chunk is individually queried against the JD vector store.
//
//  3. For each resume chunk, we retrieve the top-1 most similar
//     JD chunk using cosine similarity.
//
//  4. Alignments with score ≥ MIN_ALIGNMENT_SCORE are kept.
//
//  5. Deduplication: alignments whose JD requirement text is
//     >80% similar to an already-kept alignment are dropped
//     (prevents surfacing the same requirement 3 times).
//
//  6. Top 8 highest-confidence alignments are returned.
//
//  7. These alignments are injected into the LLM prompt as
//     structured evidence, allowing the LLM to precisely assess
//     which resume segments satisfy which JD requirements.
//
// IMPROVEMENT (v2):
//   • Larger resume chunks = better semantic coherence.
//   • Deduplication prevents repetitive alignments.
//   • Confidence threshold raised (0.25 → 0.28).
//   • Both resume segment AND JD requirement included in output.
// ─────────────────────────────────────────────────────────────
export async function buildResumeJDAlignments(resumeRawText, jdText, apiKey) {
  try {
    const vectorStore = await getOrBuildJDVectorStore(jdText, apiKey);
    if (!vectorStore) return [];

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: RESUME_CHUNK_SIZE,
      chunkOverlap: RESUME_CHUNK_OVERLAP,
    });

    const resumeDocs = await splitter.createDocuments([resumeRawText]);
    const alignments = [];
    const usedJDRequirements = new Set(); // dedup tracker

    for (const doc of resumeDocs) {
      const chunk = doc.pageContent.trim();
      if (chunk.length < 25) continue; // skip near-empty chunks

      const matches = await vectorStore.similaritySearchWithScore(chunk, 1);
      if (!matches.length) continue;

      const [matchDoc, score] = matches[0];
      // MemoryVectorStore returns L2 distance (lower = closer)
      // Convert: similarity = 1 - distance (clamped to 0-1)
      const similarity = Math.max(0, 1 - score);

      if (similarity < MIN_ALIGNMENT_SCORE) continue;

      const jdReq = matchDoc.pageContent.replace(/\s+/g, " ").trim();

      // ── Deduplication: skip if very similar JD requirement already captured ──
      const isDuplicate = [...usedJDRequirements].some(
        existing => jaccardSimilarity(jdReq, existing) > 0.80
      );
      if (isDuplicate) continue;

      usedJDRequirements.add(jdReq);
      alignments.push({
        resumeSegment: chunk.replace(/\s+/g, " "),
        jdRequirement: jdReq,
        confidence:    Math.round(similarity * 100),
      });
    }

    // Return top-8 by confidence
    return alignments
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

  } catch (err) {
    console.error("[RAG] buildResumeJDAlignments failed:", err.message);
    return [];
  }
}

/**
 * jaccardSimilarity
 * Fast word-level Jaccard similarity to detect near-duplicate strings.
 * Returns 0.0 (completely different) → 1.0 (identical).
 */
function jaccardSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}
