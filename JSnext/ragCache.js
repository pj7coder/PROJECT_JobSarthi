/**
 * ============================================================
 * RAG CACHE ENGINE — JobSarthi
 * ============================================================
 * Three caches in one module:
 *
 *  1. RESUME CACHE  — SHA-256 hash of resume rawText
 *     → If a candidate uploads the same resume twice, we serve
 *       the analysis from cache. Zero LLM calls.
 *
 *  2. JD VECTOR CACHE — SHA-256 hash of JD text
 *     → If the same job description is used again (e.g. a
 *       recruiter runs multiple interviews with same JD), we
 *       reuse the existing MemoryVectorStore without
 *       re-embedding. Saves ~N embedding API calls.
 *
 *  3. JOB SEARCH INDEX — All jobs pre-embedded on server boot
 *     → semantic job search using cosine similarity
 *       instead of `.includes()` string match.
 *     → Refreshed every 6 hours silently in background.
 * ============================================================
 */

import crypto from "crypto";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────
const RESUME_CACHE_TTL_MS = 24 * 60 * 60 * 1000;   // 24 hours
const JD_CACHE_TTL_MS     = 12 * 60 * 60 * 1000;   // 12 hours
const JOB_INDEX_TTL_MS    =  6 * 60 * 60 * 1000;   //  6 hours
const MAX_RESUME_CACHE     = 200;                   // LRU limit
const MAX_JD_CACHE         = 100;
const EMBEDDING_MODEL      = "gemini-embedding-001"; // 3072-dim

// ─────────────────────────────────────────────
// SHARED EMBEDDING INITIALISER
// ─────────────────────────────────────────────
let _embeddings = null;
function getEmbeddings(apiKey) {
  if (!_embeddings) {
    _embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
      modelName: EMBEDDING_MODEL,
    });
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

// Simple LRU eviction — remove oldest entry if over limit
function lruEvict(map, limit) {
  if (map.size <= limit) return;
  const oldest = [...map.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
  if (oldest) map.delete(oldest[0]);
}

// ─────────────────────────────────────────────
// 1. RESUME ANALYSIS CACHE
// Key: SHA-256 of resume rawText (+ optional targetRole)
// Value: full analysis result from LLM
// ─────────────────────────────────────────────
const resumeCache = new Map();

export function getResumeCache(rawText, targetRole = "") {
  const key = sha256(rawText + "|" + targetRole);
  const entry = resumeCache.get(key);
  if (!entry) return null;
  if (now() - entry.ts > RESUME_CACHE_TTL_MS) {
    resumeCache.delete(key);
    return null;
  }
  // Refresh timestamp on hit (LRU-style)
  entry.ts = now();
  console.log(`[ResumeCache] HIT — key ${key.slice(0, 12)}... Serving cached analysis.`);
  return entry.data;
}

export function setResumeCache(rawText, targetRole = "", data) {
  const key = sha256(rawText + "|" + targetRole);
  lruEvict(resumeCache, MAX_RESUME_CACHE);
  resumeCache.set(key, { ts: now(), data });
  console.log(`[ResumeCache] STORE — key ${key.slice(0, 12)}... Total entries: ${resumeCache.size}`);
}

export function getResumeCacheStats() {
  return { entries: resumeCache.size, maxEntries: MAX_RESUME_CACHE };
}

// ─────────────────────────────────────────────
// 2. JD VECTOR STORE CACHE
// Key: SHA-256 of JD text
// Value: live MemoryVectorStore pre-seeded with JD chunks
// ─────────────────────────────────────────────
const jdVectorCache = new Map();

export async function getOrBuildJDVectorStore(jdText, apiKey) {
  const key = sha256(jdText);
  const entry = jdVectorCache.get(key);
  if (entry && now() - entry.ts < JD_CACHE_TTL_MS) {
    console.log(`[JDCache] HIT — key ${key.slice(0, 12)}... Reusing existing VectorStore.`);
    return entry.store;
  }

  console.log(`[JDCache] MISS — building new VectorStore for JD (${jdText.length} chars)...`);
  const embeddings = getEmbeddings(apiKey);
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 280, chunkOverlap: 30 });
  const docs = await splitter.createDocuments([jdText]);
  const store = await MemoryVectorStore.fromDocuments(docs, embeddings);

  lruEvict(jdVectorCache, MAX_JD_CACHE);
  jdVectorCache.set(key, { ts: now(), store });
  console.log(`[JDCache] STORE — key ${key.slice(0, 12)}... Seeded ${docs.length} chunks.`);
  return store;
}

// ─────────────────────────────────────────────
// 3. JOB SEMANTIC SEARCH INDEX
// All job descriptions are embedded in one MemoryVectorStore.
// Each document has metadata: { jobId, title, company, matchScore }
// We query it with natural language and get top-K semantically similar jobs.
// ─────────────────────────────────────────────
let jobSearchIndex = null;
let jobIndexBuildTime = 0;
let jobIndexBuilding = false;
let jobIndexTotal = 0;

export async function buildJobSearchIndex(jobs, apiKey) {
  if (jobIndexBuilding) {
    console.log("[JobIndex] Build already in progress, skipping.");
    return;
  }
  if (jobSearchIndex && now() - jobIndexBuildTime < JOB_INDEX_TTL_MS) {
    console.log(`[JobIndex] Index fresh (${jobIndexTotal} jobs). Skipping rebuild.`);
    return;
  }

  jobIndexBuilding = true;
  console.log(`[JobIndex] Building semantic search index for ${jobs.length} jobs...`);

  try {
    const embeddings = getEmbeddings(apiKey);

    // Only index a representative sample if jobs count is huge
    // We take up to 3000 unique active jobs to keep memory reasonable
    const sample = jobs
      .filter(j => j.status !== "closed")
      .slice(0, 3000);

    // Create one document per job: title + skills + first 200 chars of description
    const docs = sample.map(job => {
      const content = [
        job.title || "",
        Array.isArray(job.skills) ? job.skills.join(", ") : (job.skills || ""),
        (job.description || "").slice(0, 200),
        job.company || "",
        job.location || "",
      ].filter(Boolean).join(". ");
      return {
        pageContent: content,
        metadata: {
          jobId: String(job.id || job._id || ""),
          title: job.title || "",
          company: job.company || "",
          location: job.location || "",
        },
      };
    });

    // We feed documents in batches of 100 to avoid hitting embedding rate limits
    const BATCH_SIZE = 100;
    let store = null;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      if (!store) {
        store = await MemoryVectorStore.fromDocuments(batch, embeddings);
      } else {
        await store.addDocuments(batch);
      }
      process.stdout.write(`\r[JobIndex] Embedded ${Math.min(i + BATCH_SIZE, docs.length)}/${docs.length} jobs...`);
    }
    process.stdout.write("\n");

    jobSearchIndex = store;
    jobIndexBuildTime = now();
    jobIndexTotal = sample.length;
    console.log(`[JobIndex] ✓ Index built. ${jobIndexTotal} jobs indexed.`);
  } catch (err) {
    console.error("[JobIndex] Failed to build index:", err.message);
  } finally {
    jobIndexBuilding = false;
  }
}

export async function semanticJobSearch(query, topK = 20, apiKey) {
  if (!jobSearchIndex) {
    console.warn("[JobIndex] Index not ready. Falling back to keyword search.");
    return null;
  }
  try {
    const results = await jobSearchIndex.similaritySearchWithScore(query, topK);
    // results: Array of [Document, score] where score is cosine similarity (0-1, higher = better)
    return results.map(([doc, score]) => ({
      jobId: doc.metadata.jobId,
      title: doc.metadata.title,
      company: doc.metadata.company,
      location: doc.metadata.location,
      semanticScore: parseFloat((score * 100).toFixed(1)),
    }));
  } catch (err) {
    console.error("[JobIndex] Semantic search failed:", err.message);
    return null;
  }
}

export function isJobIndexReady() {
  return !!jobSearchIndex;
}

export function getJobIndexStats() {
  return {
    ready: !!jobSearchIndex,
    totalJobs: jobIndexTotal,
    lastBuilt: jobIndexBuildTime ? new Date(jobIndexBuildTime).toISOString() : null,
    ttlRemainingMs: jobIndexBuildTime
      ? Math.max(0, JOB_INDEX_TTL_MS - (now() - jobIndexBuildTime))
      : 0,
  };
}

// ─────────────────────────────────────────────
// RESUME RAG ALIGNMENT — now uses JD cache
// Moved here from server.js RAG block for reuse
// ─────────────────────────────────────────────
export async function buildResumeJDAlignments(resumeRawText, jdText, apiKey) {
  try {
    const vectorStore = await getOrBuildJDVectorStore(jdText, apiKey);

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 280, chunkOverlap: 30 });
    const resumeDocs = await splitter.createDocuments([resumeRawText]);

    const alignments = [];
    for (const doc of resumeDocs) {
      if (doc.pageContent.trim().length < 20) continue;
      const matches = await vectorStore.similaritySearchWithScore(doc.pageContent, 1);
      if (matches.length > 0) {
        const [matchDoc, score] = matches[0];
        if (score > 0.25) { // Only include meaningful alignments
          alignments.push({
            resumeSegment: doc.pageContent.replace(/\s+/g, " ").trim(),
            jdRequirement: matchDoc.pageContent.replace(/\s+/g, " ").trim(),
            confidence: parseFloat((score * 100).toFixed(1)),
          });
        }
      }
    }

    // Sort by confidence descending, take top 8 most meaningful
    return alignments.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
  } catch (err) {
    console.error("[RAG] buildResumeJDAlignments failed:", err.message);
    return [];
  }
}
