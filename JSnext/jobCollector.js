import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import dns from "dns";

dotenv.config();

// Override local DNS to prevent connection failure to MongoDB Atlas (skip on Vercel)
if (!process.env.VERCEL) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (err) {
    console.warn("[DNS] Failed to override DNS servers:", err.message);
  }
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, "db.json");

// Connect to DB Helper
let dbClient = null;
let mongoDb = null;

async function getDB() {
  if (mongoDb) return mongoDb;
  if (process.env.MONGO_URI) {
    try {
      dbClient = new MongoClient(process.env.MONGO_URI);
      await dbClient.connect();
      mongoDb = dbClient.db("jobsarthi");
      console.log("[JobCollector] Connected to MongoDB Atlas");
      return mongoDb;
    } catch (err) {
      console.error("[JobCollector] Failed to connect to MongoDB, using local db.json fallback:", err);
    }
  }
  return null;
}

// Read/Write Local fallback db.json
async function readLocalDB() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return { users: [], jobs: [], applications: [], messages: [] };
  }
}

async function writeLocalDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Generate unique job ID using deterministic hash to avoid duplicate keys
export function generateJobId(company, title, location) {
  const cleanString = `${company.toLowerCase()}_${title.toLowerCase()}_${(location || "").toLowerCase()}`;
  return "agg_" + crypto.createHash("sha256").update(cleanString).digest("hex").slice(0, 16);
}

// --- ATS Detection ---
export function detectATS(html, url) {
  const lowercaseHtml = (html || "").toLowerCase();
  const lowercaseUrl = (url || "").toLowerCase();

  if (lowercaseUrl.includes("greenhouse.io") || lowercaseHtml.includes("greenhouse.io") || lowercaseHtml.includes("grnh.se")) {
    return "greenhouse";
  }
  if (lowercaseUrl.includes("lever.co") || lowercaseHtml.includes("lever.co") || lowercaseHtml.includes("jobs.lever.co")) {
    return "lever";
  }
  if (lowercaseUrl.includes("ashbyhq.com") || lowercaseHtml.includes("ashbyhq.com") || lowercaseHtml.includes("ashby-jobs")) {
    return "ashby";
  }
  if (lowercaseUrl.includes("smartrecruiters.com") || lowercaseHtml.includes("smartrecruiters.com")) {
    return "smartrecruiters";
  }
  if (lowercaseUrl.includes("myworkdayjobs.com") || lowercaseHtml.includes("myworkdayjobs.com")) {
    return "workday";
  }
  return null;
}

// --- ATS COLLECTORS ---

// 1. Greenhouse Board API
export async function fetchGreenhouseJobs(boardToken) {
  console.log(`[Greenhouse] Fetching jobs for board: ${boardToken}`);
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Greenhouse API status: ${res.status}`);
    const data = await res.json();
    return (data.jobs || []).map(job => ({
      source_id: job.id.toString(),
      source: "greenhouse",
      title: job.title,
      company: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
      location: job.location ? job.location.name : "Remote",
      department: job.departments && job.departments.length > 0 ? job.departments[0].name : "General",
      employment_type: "Full-time", // fallback default
      description: job.content || "No description provided.",
      skills: extractSkillsFromText(job.content || ""),
      salary: "Not specified",
      apply_url: job.absolute_url,
      posted_date: job.updated_at ? new Date(job.updated_at) : new Date()
    }));
  } catch (err) {
    console.error(`[Greenhouse] Error fetching ${boardToken}:`, err.message);
    return [];
  }
}

// 2. Lever API
export async function fetchLeverJobs(companyId) {
  console.log(`[Lever] Fetching jobs for company: ${companyId}`);
  const url = `https://api.lever.co/v0/postings/${companyId}?mode=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Lever API status: ${res.status}`);
    const data = await res.json();
    return data.map(job => ({
      source_id: job.id,
      source: "lever",
      title: job.text,
      company: companyId.charAt(0).toUpperCase() + companyId.slice(1),
      location: job.categories ? job.categories.location : "Remote",
      department: job.categories ? job.categories.department : "General",
      employment_type: job.categories ? job.categories.commitment : "Full-time",
      description: job.descriptionPlain || (job.additionalPlain ? job.additionalPlain : "No description provided."),
      skills: extractSkillsFromText(job.descriptionPlain || ""),
      salary: "Not specified",
      apply_url: job.applyUrl,
      posted_date: job.createdAt ? new Date(job.createdAt) : new Date()
    }));
  } catch (err) {
    console.error(`[Lever] Error fetching ${companyId}:`, err.message);
    return [];
  }
}

// 3. Ashby API
export async function fetchAshbyJobs(boardId, companyName) {
  console.log(`[Ashby] Fetching jobs for board: ${boardId}`);
  // Using public board api endpoint
  const url = `https://api.ashbyhq.com/posting-api/job-board/${boardId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ashby API status: ${res.status}`);
    const data = await res.json();
    const jobsList = data.jobs || [];
    return jobsList.map(job => ({
      source_id: job.id,
      source: "ashby",
      title: job.title,
      company: companyName || boardId.charAt(0).toUpperCase() + boardId.slice(1),
      location: job.location || (job.isRemote ? "Remote" : "See details"),
      department: job.department || job.team || "General",
      employment_type: job.employmentType || "Full-time",
      description: job.descriptionHtml || job.descriptionPlain || "No description provided.",
      skills: extractSkillsFromText(job.descriptionPlain || ""),
      salary: "Not specified",
      apply_url: job.applyUrl || job.jobUrl,
      posted_date: job.publishedAt ? new Date(job.publishedAt) : new Date()
    }));
  } catch (err) {
    console.error(`[Ashby] Error fetching ${boardId}:`, err.message);
    return [];
  }
}

// 4. SmartRecruiters API
export async function fetchSmartRecruitersJobs(companyId) {
  console.log(`[SmartRecruiters] Fetching jobs for company: ${companyId}`);
  const url = `https://api.smartrecruiters.com/v1/companies/${companyId}/postings`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SmartRecruiters API status: ${res.status}`);
    const data = await res.json();
    const postings = data.content || [];
    
    // Detailed detail fetching for each posting
    const jobs = [];
    for (const p of postings.slice(0, 10)) { // limit to top 10 for latency safety
      const detailUrl = `https://api.smartrecruiters.com/v1/companies/${companyId}/postings/${p.id}`;
      try {
        const detailRes = await fetch(detailUrl);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          jobs.push({
            source_id: p.id,
            source: "smartrecruiters",
            title: p.name,
            company: p.company ? p.company.name : "Partner Company",
            location: p.location ? `${p.location.city}, ${p.location.country}` : "Remote",
            department: p.department ? p.department.name : "General",
            employment_type: p.typeOfEmployment ? p.typeOfEmployment.label : "Full-time",
            description: detail.sections ? Object.values(detail.sections).map(s => `<h3>${s.title}</h3><p>${s.text}</p>`).join("") : "No description provided.",
            skills: extractSkillsFromText(JSON.stringify(detail.sections || {})),
            salary: "Not specified",
            apply_url: `https://jobs.smartrecruiters.com/${companyId}/${p.id}`,
            posted_date: p.releasedDate ? new Date(p.releasedDate) : new Date()
          });
        }
      } catch (e) {
        // Fallback with limited details if detail API fails
        jobs.push({
          source_id: p.id,
          source: "smartrecruiters",
          title: p.name,
          company: companyId,
          location: p.location ? p.location.city : "Remote",
          department: "General",
          employment_type: "Full-time",
          description: "No details available.",
          skills: "",
          salary: "Not specified",
          apply_url: `https://jobs.smartrecruiters.com/${companyId}/${p.id}`,
          posted_date: new Date()
        });
      }
    }
    return jobs;
  } catch (err) {
    console.error(`[SmartRecruiters] Error fetching ${companyId}:`, err.message);
    return [];
  }
}

// 5. Generic Career Page HTML Scraper (Fallback)
export async function scrapeCareerPage(companyName, url) {
  console.log(`[Scraper] Scraping career page for ${companyName}: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) throw new Error(`Fetch returned status: ${res.status}`);
    const html = await res.text();

    // Check if an ATS exists in this page
    const detected = detectATS(html, url);
    if (detected) {
      console.log(`[Scraper] ATS "${detected}" detected during live scrape for ${companyName}. Recommended integration flow.`);
      // We will flag this so the orchestrator knows to switch
      return { atsDetected: detected };
    }

    // Heuristics-based Regex Parser for generic career pages
    const jobs = [];
    
    // Look for link structures or lists that look like jobs
    const jobLinkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let matchCount = 0;

    while ((match = jobLinkRegex.exec(html)) !== null && matchCount < 10) {
      const linkHref = match[1];
      const linkText = match[2].replace(/<[^>]*>/g, '').trim();

      // Check if text looks like a job title and url is a listing link
      if (
        (linkText.length > 5 && linkText.length < 50) &&
        (linkHref.includes("/job/") || linkHref.includes("/careers/") || linkHref.includes("/posting/")) &&
        /\b(engineer|developer|designer|manager|specialist|lead|analyst|intern|senior|junior)\b/i.test(linkText)
      ) {
        let absoluteUrl = linkHref;
        if (linkHref.startsWith("/")) {
          const parsedUrl = new URL(url);
          absoluteUrl = parsedUrl.origin + linkHref;
        }

        jobs.push({
          source_id: crypto.createHash("md5").update(absoluteUrl).digest("hex").slice(0, 10),
          source: "career_page",
          title: linkText,
          company: companyName,
          location: "See details",
          department: "General",
          employment_type: "Full-time",
          description: `Direct application link found on career page. Please visit: ${absoluteUrl}`,
          skills: "",
          salary: "Not specified",
          apply_url: absoluteUrl,
          posted_date: new Date()
        });
        matchCount++;
      }
    }

    return { jobs };
  } catch (err) {
    console.error(`[Scraper] Error crawling ${companyName}:`, err.message);
    return { jobs: [] };
  }
}

// Utility skill extraction helper (Simple matching regex)
function extractSkillsFromText(text) {
  const skillsList = [
    "JavaScript", "React", "Node.js", "Express", "MongoDB", "PostgreSQL", "SQL", "Python", "Django",
    "Java", "Spring Boot", "C++", "C#", "TypeScript", "Angular", "Vue", "Docker", "Kubernetes", "AWS",
    "Azure", "GCP", "HTML", "CSS", "Git", "Rust", "Golang", "Figma", "Product Management", "Machine Learning", "AI"
  ];
  const matched = [];
  const lower = text.toLowerCase();
  for (const skill of skillsList) {
    if (new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower)) {
      matched.push(skill);
    }
  }
  return matched.join(", ");
}

// Heuristic check to filter jobs suitable for Indian job seekers (either remote, or located in India)
export function isJobSuitableForIndia(job) {
  const loc = (job.location || "").toLowerCase();
  
  // List of major Indian cities/regions and remote variations
  const matchesIndia = [
    "india", "bangalore", "bengaluru", "hyderabad", "pune", "mumbai", "noida", 
    "gurgaon", "gurugram", "chennai", "delhi", "kolkata", "ahmedabad", "kochi", 
    "jaipur", "indore", "coimbatore", "remote", "anywhere", "telecommute", "wfh"
  ];
  
  for (const match of matchesIndia) {
    if (loc.includes(match)) {
      return true;
    }
  }

  // If the job location contains other foreign cities but does not contain remote/india, skip it.
  const foreignCities = ["london", "new york", "san francisco", "berlin", "paris", "tokyo", "singapore", "sydney", "austin", "seattle", "chicago", "boston", "toronto"];
  for (const city of foreignCities) {
    if (loc.includes(city)) {
      return false; 
    }
  }
  
  // Default to keeping it if it's general/unspecified
  return true;
}

// --- QUALITY VALIDATION & NORMALIZATION ---
export function generateFingerprint(company, title, location) {
  const clean = str => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  return `${clean(company)}_${clean(title)}_${clean(location)}`;
}

export function validateAndNormalizeJob(job) {
  if (!job.title || typeof job.title !== "string" || !job.title.trim()) {
    return { valid: false, reason: "missing title" };
  }
  if (!job.company || typeof job.company !== "string" || !job.company.trim()) {
    return { valid: false, reason: "missing company" };
  }
  if (!job.apply_url || typeof job.apply_url !== "string" || !job.apply_url.trim() || !/^https?:\/\/\S+$/i.test(job.apply_url)) {
    return { valid: false, reason: "broken apply URL" };
  }

  const normalized = { ...job };
  normalized.company = normalized.company.trim();
  normalized.title = normalized.title.trim();
  
  // Location normalization
  let loc = (normalized.location || "Remote").trim();
  if (loc.toLowerCase() === "telecommute" || loc.toLowerCase() === "wfh" || loc.toLowerCase() === "anywhere") {
    loc = "Remote";
  }
  normalized.location = loc;

  // Employment type normalization
  let type = (normalized.employment_type || "Full-time").trim();
  const typeLower = type.toLowerCase();
  if (typeLower.includes("full")) {
    type = "Full-time";
  } else if (typeLower.includes("part")) {
    type = "Part-time";
  } else if (typeLower.includes("contract")) {
    type = "Contract";
  } else if (typeLower.includes("intern") || typeLower.includes("co-op")) {
    type = "Internship";
  } else {
    type = "Full-time";
  }
  normalized.employment_type = type;
  normalized.type = type; // compatibility

  // Salary format normalization
  let salary = (normalized.salary || "Not specified").trim();
  normalized.salary = salary;

  return { valid: true, job: normalized };
}

export async function processAndSaveJobs(allCollectedJobs, syncedCompanies, currentSyncTimestamp = new Date()) {
  const db = await getDB();
  const stats = {
    inserted: 0,
    updated: 0,
    duplicates_prevented: 0,
    broken_urls: 0,
    jobs_closed: 0
  };

  const processedJobs = [];

  for (const rawJob of allCollectedJobs) {
    const valResult = validateAndNormalizeJob(rawJob);
    if (!valResult.valid) {
      console.warn(`[JobCollector] Job validation failed: ${valResult.reason}`, rawJob.title);
      stats.broken_urls++;
      continue;
    }

    const job = valResult.job;
    const internalId = generateJobId(job.company, job.title, job.location);
    const fingerprint = generateFingerprint(job.company, job.title, job.location);

    job.id = internalId;
    job.internal_id = internalId;
    job.fingerprint = fingerprint;
    job.external_job_id = job.source_id || "";
    job.last_seen_at = currentSyncTimestamp;
    job.status = "active";

    processedJobs.push(job);
  }

  if (db) {
    // Write to MongoDB
    for (const job of processedJobs) {
      if (!isJobSuitableForIndia(job)) continue;
      
      let existing = null;
      if (job.external_job_id) {
        existing = await db.collection("jobs").findOne({
          external_job_id: job.external_job_id,
          source: job.source
        });
      }
      if (!existing) {
        existing = await db.collection("jobs").findOne({
          fingerprint: job.fingerprint
        });
      }

      const normalizedJob = {
        id: job.id,
        internal_id: job.internal_id,
        external_job_id: job.external_job_id,
        source_id: job.source_id || "",
        source: job.source,
        company: job.company,
        title: job.title,
        description: job.description,
        location: job.location,
        employment_type: job.employment_type,
        type: job.type,
        apply_url: job.apply_url,
        applyUrl: job.apply_url,
        posted_at: job.posted_date || currentSyncTimestamp,
        posted_date: job.posted_date || currentSyncTimestamp,
        last_seen_at: currentSyncTimestamp,
        status: "active",
        fingerprint: job.fingerprint,
        skills: job.skills || "General tech skills",
        logo: "🌐",
        category: job.department || "Software Engineering",
        salary: job.salary || "Not specified",
        reqs: job.reqs || [
          "Demonstrated project experience.",
          "Solid knowledge of core engineering principles.",
          "Strong communication and collaborative alignment."
        ],
        updated_at: currentSyncTimestamp
      };

      if (existing) {
        await db.collection("jobs").updateOne(
          { _id: existing._id },
          { 
            $set: {
              ...normalizedJob,
              first_seen_at: existing.first_seen_at || existing.created_at || currentSyncTimestamp
            } 
          }
        );
        stats.updated++;
        stats.duplicates_prevented++;
      } else {
        normalizedJob.first_seen_at = currentSyncTimestamp;
        normalizedJob.created_at = currentSyncTimestamp;
        await db.collection("jobs").insertOne(normalizedJob);
        stats.inserted++;
      }
    }

    // Closed Job Detection
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const company of syncedCompanies) {
      const closedResult = await db.collection("jobs").updateMany(
        {
          company: { $regex: new RegExp("^" + escapeRegex(company.name) + "$", "i") },
          source: company.ats,
          status: "active",
          $or: [
            { last_seen_at: { $lt: currentSyncTimestamp } },
            { last_seen_at: { $exists: false } }
          ]
        },
        {
          $set: {
            status: "closed",
            verification_score: 0,
            updated_at: currentSyncTimestamp
          }
        }
      );
      stats.jobs_closed += closedResult.modifiedCount || 0;
    }

  } else {
    // Write to Local db.json
    const local = await readLocalDB();
    if (!local.jobs) local.jobs = [];

    for (const job of processedJobs) {
      if (!isJobSuitableForIndia(job)) continue;

      let existingIdx = -1;
      if (job.external_job_id) {
        existingIdx = local.jobs.findIndex(j => j.external_job_id === job.external_job_id && j.source === job.source);
      }
      if (existingIdx === -1) {
        existingIdx = local.jobs.findIndex(j => j.fingerprint === job.fingerprint);
      }

      const normalizedJob = {
        id: job.id,
        internal_id: job.internal_id,
        external_job_id: job.external_job_id,
        source_id: job.source_id || "",
        source: job.source,
        company: job.company,
        title: job.title,
        description: job.description,
        location: job.location,
        employment_type: job.employment_type,
        type: job.type,
        apply_url: job.apply_url,
        applyUrl: job.apply_url,
        posted_at: job.posted_date || currentSyncTimestamp,
        posted_date: job.posted_date || currentSyncTimestamp,
        last_seen_at: currentSyncTimestamp,
        status: "active",
        fingerprint: job.fingerprint,
        skills: job.skills || "General tech skills",
        logo: "🌐",
        category: job.department || "Software Engineering",
        salary: job.salary || "Not specified",
        reqs: job.reqs || [
          "Demonstrated project experience.",
          "Solid knowledge of core engineering principles.",
          "Strong communication and collaborative alignment."
        ],
        updated_at: currentSyncTimestamp
      };

      if (existingIdx !== -1) {
        const existing = local.jobs[existingIdx];
        local.jobs[existingIdx] = {
          ...existing,
          ...normalizedJob,
          first_seen_at: existing.first_seen_at || existing.created_at || currentSyncTimestamp
        };
        stats.updated++;
        stats.duplicates_prevented++;
      } else {
        normalizedJob.first_seen_at = currentSyncTimestamp;
        normalizedJob.created_at = currentSyncTimestamp;
        local.jobs.unshift(normalizedJob);
        stats.inserted++;
      }
    }

    // Closed Job Detection
    syncedCompanies.forEach(company => {
      let closedCount = 0;
      local.jobs.forEach(j => {
        if (
          j.company && j.company.toLowerCase() === company.name.toLowerCase() &&
          j.source === company.ats &&
          j.status === "active" &&
          (!j.last_seen_at || new Date(j.last_seen_at) < currentSyncTimestamp)
        ) {
          j.status = "closed";
          j.verification_score = 0;
          j.updated_at = currentSyncTimestamp;
          closedCount++;
        }
      });
      stats.jobs_closed += closedCount;
    });

    await writeLocalDB(local);
  }

  return stats;
}

// --- MAIN PIPELINE ---
export async function runJobCollectionPipeline(targetCompanies) {
  console.log(`[JobCollector] Starting pipeline run for ${targetCompanies.length} companies...`);
  
  const allCollectedJobs = [];

  for (const entry of targetCompanies) {
    try {
      if (entry.ats === "greenhouse") {
        const fetched = await fetchGreenhouseJobs(entry.token);
        allCollectedJobs.push(...fetched);
      } else if (entry.ats === "lever") {
        const fetched = await fetchLeverJobs(entry.token);
        allCollectedJobs.push(...fetched);
      } else if (entry.ats === "ashby") {
        const fetched = await fetchAshbyJobs(entry.token, entry.name);
        allCollectedJobs.push(...fetched);
      } else if (entry.ats === "smartrecruiters") {
        const fetched = await fetchSmartRecruitersJobs(entry.token);
        allCollectedJobs.push(...fetched);
      } else {
        const result = await scrapeCareerPage(entry.name, entry.url);
        if (result.atsDetected) {
          console.log(`[JobCollector] Redirecting company ${entry.name} to detected ATS: ${result.atsDetected}`);
          if (result.atsDetected === "greenhouse") {
            const token = extractSlugFromUrl(entry.url, "greenhouse");
            if (token) allCollectedJobs.push(...(await fetchGreenhouseJobs(token)));
          } else if (result.atsDetected === "lever") {
            const token = extractSlugFromUrl(entry.url, "lever");
            if (token) allCollectedJobs.push(...(await fetchLeverJobs(token)));
          }
        } else if (result.jobs && result.jobs.length > 0) {
          allCollectedJobs.push(...result.jobs);
        }
      }
    } catch (err) {
      console.error(`[JobCollector] Error processing company ${entry.name}:`, err);
    }
  }

  console.log(`[JobCollector] Normalizing and saving ${allCollectedJobs.length} collected jobs...`);
  
  const currentSyncTimestamp = new Date();
  const stats = await processAndSaveJobs(allCollectedJobs, targetCompanies, currentSyncTimestamp);
  
  console.log(`[JobCollector] Pipeline finished. Stats:`, stats);
  return stats;
}

// --- GREENHOUSE SYNC ENGINE ---
export async function runGreenhouseSync() {
  console.log("[JobCollector] Starting full Greenhouse Sync Engine run...");
  const greenhouseCompanies = TARGET_COMPANIES.filter(c => c.ats === "greenhouse");
  console.log(`[JobCollector] Found ${greenhouseCompanies.length} Greenhouse companies to sync.`);
  
  const stats = {
    total_jobs_synced: 0,
    new_jobs_added: 0,
    jobs_updated: 0,
    jobs_closed: 0,
    duplicates_prevented: 0,
    sync_failures: 0,
    broken_urls_detected: 0
  };

  const currentSyncTimestamp = new Date();
  const allFetchedJobs = [];

  for (const company of greenhouseCompanies) {
    try {
      const jobs = await fetchGreenhouseJobs(company.token);
      if (jobs && jobs.length > 0) {
        allFetchedJobs.push(...jobs);
      }
    } catch (err) {
      console.error(`[JobCollector] Failed to fetch Greenhouse jobs for ${company.name}:`, err.message);
      stats.sync_failures++;
    }
  }

  console.log(`[JobCollector] Fetched ${allFetchedJobs.length} raw jobs. Processing validation and normalization...`);

  const saveStats = await processAndSaveJobs(allFetchedJobs, greenhouseCompanies, currentSyncTimestamp);
  stats.new_jobs_added = saveStats.inserted;
  stats.jobs_updated = saveStats.updated;
  stats.duplicates_prevented = saveStats.duplicates_prevented;
  stats.broken_urls_detected = saveStats.broken_urls;
  stats.total_jobs_synced = allFetchedJobs.length - saveStats.broken_urls;
  stats.jobs_closed = saveStats.jobs_closed;

  try {
    const db = await getDB();
    const syncLog = {
      id: "sync_log_" + Date.now(),
      timestamp: currentSyncTimestamp.toISOString(),
      source: "greenhouse",
      stats
    };

    if (db) {
      await db.collection("sync_logs").insertOne(syncLog);
    } else {
      const local = await readLocalDB();
      if (!local.sync_logs) local.sync_logs = [];
      local.sync_logs.unshift(syncLog);
      await writeLocalDB(local);
    }
    console.log("[JobCollector] Logged sync stats successfully:", stats);
  } catch (logErr) {
    console.error("[JobCollector] Failed to write sync log:", logErr);
  }

  console.log("[JobCollector] Greenhouse Sync Pipeline completed. Stats:", stats);
  return stats;
}

// Utility helper to extract ATS slugs from typical career links
function extractSlugFromUrl(url, ats) {
  try {
    const parts = url.split("/");
    if (ats === "greenhouse") {
      const index = parts.findIndex(p => p.includes("greenhouse.io"));
      if (index !== -1 && parts[index + 1]) return parts[index + 1];
    } else if (ats === "lever") {
      const index = parts.findIndex(p => p.includes("lever.co"));
      if (index !== -1 && parts[index + 1]) return parts[index + 1];
    }
  } catch (e) {}
  return null;
}

// Global curated list of target tech companies (100 companies using Greenhouse, Lever, Ashby, and SmartRecruiters)
export const TARGET_COMPANIES = [
  // --- Greenhouse (1-45) ---
  { name: "Figma", url: "https://careers.figma.com", ats: "greenhouse", token: "figma" },
  { name: "Airbnb", url: "https://careers.airbnb.com", ats: "greenhouse", token: "airbnb" },
  { name: "Stripe", url: "https://stripe.com/jobs", ats: "greenhouse", token: "stripe" },
  { name: "Uber", url: "https://www.uber.com/careers", ats: "greenhouse", token: "uber" },
  { name: "Lyft", url: "https://www.lyft.com/careers", ats: "greenhouse", token: "lyft" },
  { name: "Datadog", url: "https://www.datadoghq.com/careers", ats: "greenhouse", token: "datadog" },
  { name: "Cloudflare", url: "https://www.cloudflare.com/careers", ats: "greenhouse", token: "cloudflare" },
  { name: "Zoom", url: "https://careers.zoom.us", ats: "greenhouse", token: "zoom" },
  { name: "Robinhood", url: "https://careers.robinhood.com", ats: "greenhouse", token: "robinhood" },
  { name: "Reddit", url: "https://www.redditinc.com/careers", ats: "greenhouse", token: "reddit" },
  { name: "HubSpot", url: "https://careers.hubspot.com", ats: "greenhouse", token: "hubspot" },
  { name: "Roblox", url: "https://careers.roblox.com", ats: "greenhouse", token: "roblox" },
  { name: "Twilio", url: "https://careers.twilio.com", ats: "greenhouse", token: "twilio" },
  { name: "Pinterest", url: "https://careers.pinterest.com", ats: "greenhouse", token: "pinterest" },
  { name: "Snap", url: "https://careers.snap.com", ats: "greenhouse", token: "snapchat" },
  { name: "Okta", url: "https://www.okta.com/careers", ats: "greenhouse", token: "okta" },
  { name: "Affirm", url: "https://www.affirm.com/careers", ats: "greenhouse", token: "affirm" },
  { name: "Instacart", url: "https://instacart.careers", ats: "greenhouse", token: "instacart" },
  { name: "Chime", url: "https://www.chime.com/careers", ats: "greenhouse", token: "chime" },
  { name: "Coinbase", url: "https://www.coinbase.com/careers", ats: "greenhouse", token: "coinbase" },
  { name: "DoorDash", url: "https://careers.doordash.com", ats: "greenhouse", token: "doordash" },
  { name: "GitLab", url: "https://about.gitlab.com/jobs", ats: "greenhouse", token: "gitlab" },
  { name: "HashiCorp", url: "https://www.hashicorp.com/careers", ats: "greenhouse", token: "hashicorp" },
  { name: "MongoDB", url: "https://www.mongodb.com/careers", ats: "greenhouse", token: "mongodb" },
  { name: "NerdWallet", url: "https://www.nerdwallet.com/careers", ats: "greenhouse", token: "nerdwallet" },
  { name: "PagerDuty", url: "https://www.pagerduty.com/careers", ats: "greenhouse", token: "pagerduty" },
  { name: "Plaid", url: "https://plaid.com/careers", ats: "greenhouse", token: "plaid" },
  { name: "Squarespace", url: "https://www.squarespace.com/careers", ats: "greenhouse", token: "squarespace" },
  { name: "Toast", url: "https://careers.toasttab.com", ats: "greenhouse", token: "toasttab" },
  { name: "Unity", url: "https://careers.unity.com", ats: "greenhouse", token: "unity" },
  { name: "Wayfair", url: "https://www.aboutwayfair.com/careers", ats: "greenhouse", token: "wayfair" },
  { name: "ZipRecruiter", url: "https://www.ziprecruiter.com/careers", ats: "greenhouse", token: "ziprecruiter" },
  { name: "Atlassian", url: "https://www.atlassian.com/careers", ats: "greenhouse", token: "atlassian" },
  { name: "Elastic", url: "https://www.elastic.co/careers", ats: "greenhouse", token: "elastic" },
  { name: "Docusign", url: "https://www.docusign.com/careers", ats: "greenhouse", token: "docusign" },
  { name: "Confluent", url: "https://www.confluent.io/careers", ats: "greenhouse", token: "confluent" },
  { name: "Snowflake", url: "https://www.snowflake.com/careers", ats: "greenhouse", token: "snowflake" },
  { name: "CrowdStrike", url: "https://www.crowdstrike.com/careers", ats: "greenhouse", token: "crowdstrike" },
  { name: "Palo Alto Networks", url: "https://jobs.paloaltonetworks.com", ats: "greenhouse", token: "paloaltonetworks" },
  { name: "Zillow", url: "https://careers.zillowgroup.com", ats: "greenhouse", token: "zillow" },
  { name: "Riot Games", url: "https://www.riotgames.com/careers", ats: "greenhouse", token: "riotgames" },
  { name: "Notion", url: "https://www.notion.so/careers", ats: "greenhouse", token: "notion" },
  { name: "Miro", url: "https://miro.com/careers", ats: "greenhouse", token: "miro" },
  { name: "Gusto", url: "https://gusto.com/careers", ats: "greenhouse", token: "gusto" },
  { name: "Scale AI", url: "https://scale.com/careers", ats: "greenhouse", token: "scaleai" },

  // --- Lever (46-80) ---
  { name: "Vercel", url: "https://vercel.com/careers", ats: "lever", token: "vercel" },
  { name: "Netflix", url: "https://jobs.netflix.com", ats: "lever", token: "netflix" },
  { name: "Sentry", url: "https://sentry.io/careers", ats: "lever", token: "sentry" },
  { name: "Spotify", url: "https://www.lifeatspotify.com", ats: "lever", token: "spotify" },
  { name: "Slack", url: "https://slack.com/careers", ats: "lever", token: "slack" },
  { name: "Yelp", url: "https://www.yelp.careers", ats: "lever", token: "yelp" },
  { name: "Eventbrite", url: "https://www.eventbrite.careers", ats: "lever", token: "eventbrite" },
  { name: "Udemy", url: "https://about.udemy.com/careers", ats: "lever", token: "udemy" },
  { name: "Medium", url: "https://medium.jobs", ats: "lever", token: "medium" },
  { name: "Coursera", url: "https://about.coursera.org/careers", ats: "lever", token: "coursera" },
  { name: "Buffer", url: "https://journey.buffer.com", ats: "lever", token: "buffer" },
  { name: "Loom", url: "https://www.loom.com/careers", ats: "lever", token: "loom" },
  { name: "Docker", url: "https://www.docker.com/careers", ats: "lever", token: "docker" },
  { name: "DigitalOcean", url: "https://www.digitalocean.com/careers", ats: "lever", token: "digitalocean" },
  { name: "Postman", url: "https://www.postman.com/careers", ats: "lever", token: "postman" },
  { name: "Webflow", url: "https://webflow.com/careers", ats: "lever", token: "webflow" },
  { name: "Zapier", url: "https://zapier.com/careers", ats: "lever", token: "zapier" },
  { name: "CircleCI", url: "https://circleci.com/careers", ats: "lever", token: "circleci" },
  { name: "1Password", url: "https://1password.com/careers", ats: "lever", token: "1password" },
  { name: "Grammarly", url: "https://www.grammarly.com/careers", ats: "lever", token: "grammarly" },
  { name: "Hotjar", url: "https://careers.hotjar.com", ats: "lever", token: "hotjar" },
  { name: "Intercom", url: "https://www.intercom.com/careers", ats: "lever", token: "intercom" },
  { name: "Mux", url: "https://www.mux.com/careers", ats: "lever", token: "mux" },
  { name: "Netlify", url: "https://www.netlify.com/careers", ats: "lever", token: "netlify" },
  { name: "Shippo", url: "https://goshippo.com/careers", ats: "lever", token: "shippo" },
  { name: "Sourcegraph", url: "https://about.sourcegraph.com/jobs", ats: "lever", token: "sourcegraph" },
  { name: "Superhuman", url: "https://superhuman.com/careers", ats: "lever", token: "superhuman" },
  { name: "Tailscale", url: "https://tailscale.com/careers", ats: "lever", token: "tailscale" },
  { name: "Asana", url: "https://asana.com/jobs", ats: "lever", token: "asana" },
  { name: "ActiveCampaign", url: "https://www.activecampaign.com/careers", ats: "lever", token: "activecampaign" },
  { name: "Figma Lever", url: "https://jobs.lever.co/figma", ats: "lever", token: "figma" },
  { name: "Stripe Lever", url: "https://jobs.lever.co/stripe", ats: "lever", token: "stripe" },
  { name: "Vanta Lever", url: "https://jobs.lever.co/vanta", ats: "lever", token: "vanta" },
  { name: "Lever Company", url: "https://jobs.lever.co/lever", ats: "lever", token: "lever" },
  { name: "Twitch", url: "https://jobs.lever.co/twitch", ats: "lever", token: "twitch" },

  // --- Ashby (81-95) ---
  { name: "Linear", url: "https://ashbyhq.com/linear", ats: "ashby", token: "linear" },
  { name: "Vanta", url: "https://ashbyhq.com/vanta", ats: "ashby", token: "vanta" },
  { name: "Retool", url: "https://ashbyhq.com/retool", ats: "ashby", token: "retool" },
  { name: "Clerk", url: "https://ashbyhq.com/clerk", ats: "ashby", token: "clerk" },
  { name: "OpenAI", url: "https://ashbyhq.com/openai", ats: "ashby", token: "openai" },
  { name: "Anthropic", url: "https://ashbyhq.com/anthropic", ats: "ashby", token: "anthropic" },
  { name: "Perplexity", url: "https://ashbyhq.com/perplexity", ats: "ashby", token: "perplexity" },
  { name: "Midjourney", url: "https://ashbyhq.com/midjourney", ats: "ashby", token: "midjourney" },
  { name: "Mistral", url: "https://ashbyhq.com/mistral", ats: "ashby", token: "mistral" },
  { name: "Hugging Face", url: "https://ashbyhq.com/huggingface", ats: "ashby", token: "huggingface" },
  { name: "Runway", url: "https://ashbyhq.com/runway", ats: "ashby", token: "runway" },
  { name: "ElevenLabs", url: "https://ashbyhq.com/elevenlabs", ats: "ashby", token: "elevenlabs" },
  { name: "Glean", url: "https://ashbyhq.com/glean", ats: "ashby", token: "glean" },
  { name: "Pinecone", url: "https://ashbyhq.com/pinecone", ats: "ashby", token: "pinecone" },
  { name: "LangChain", url: "https://ashbyhq.com/langchain", ats: "ashby", token: "langchain" },

  // --- SmartRecruiters (96-100) ---
  { name: "SmartRecruiters Inc", url: "https://careers.smartrecruiters.com/SmartRecruiters", ats: "smartrecruiters", token: "SmartRecruiters" },
  { name: "Bosch", url: "https://careers.smartrecruiters.com/BoschGroup", ats: "smartrecruiters", token: "BoschGroup" },
  { name: "Visa", url: "https://careers.smartrecruiters.com/Visa", ats: "smartrecruiters", token: "Visa" },
  { name: "Ubisoft", url: "https://careers.smartrecruiters.com/Ubisoft", ats: "smartrecruiters", token: "Ubisoft" },
  { name: "Equinox", url: "https://careers.smartrecruiters.com/Equinox", ats: "smartrecruiters", token: "Equinox" }
];

// Round-robin selector to fetch 1 company per hour
export async function syncNextCompany() {
  const db = await getDB();
  const companyLastUpdated = {};

  try {
    if (db) {
      const syncs = await db.collection("company_syncs").find({}).toArray();
      syncs.forEach(s => {
        companyLastUpdated[s.company.toLowerCase()] = new Date(s.last_synced_at).getTime();
      });
    } else {
      const local = await readLocalDB();
      if (!local.company_syncs) local.company_syncs = [];
      local.company_syncs.forEach(s => {
        companyLastUpdated[s.company.toLowerCase()] = new Date(s.last_synced_at).getTime();
      });
    }
  } catch (err) {
    console.error("[JobCollector] Error checking last sync times:", err);
  }

  // Find the company in TARGET_COMPANIES with the oldest lastUpdated timestamp (or never updated)
  let chosenCompany = null;
  let oldestTime = Infinity;

  for (const comp of TARGET_COMPANIES) {
    const lastTime = companyLastUpdated[comp.name.toLowerCase()];
    if (lastTime === undefined) {
      // Never synced, pick immediately!
      chosenCompany = comp;
      break;
    }
    if (lastTime < oldestTime) {
      oldestTime = lastTime;
      chosenCompany = comp;
    }
  }

  if (chosenCompany) {
    console.log(`[JobCollector] Round-Robin Sync: Chosen company is "${chosenCompany.name}" (Last sync: ${oldestTime === Infinity ? 'Never' : new Date(oldestTime).toISOString()})`);
    const stats = await runJobCollectionPipeline([chosenCompany]);

    // Update the sync timestamp in company_syncs
    try {
      if (db) {
        await db.collection("company_syncs").updateOne(
          { company: chosenCompany.name.toLowerCase() },
          { $set: { last_synced_at: new Date() } },
          { upsert: true }
        );
      } else {
        const local = await readLocalDB();
        if (!local.company_syncs) local.company_syncs = [];
        const index = local.company_syncs.findIndex(s => s.company.toLowerCase() === chosenCompany.name.toLowerCase());
        if (index > -1) {
          local.company_syncs[index].last_synced_at = new Date();
        } else {
          local.company_syncs.push({ company: chosenCompany.name.toLowerCase(), last_synced_at: new Date() });
        }
        await writeLocalDB(local);
      }
    } catch (err) {
      console.error("[JobCollector] Error updating sync timestamp:", err);
    }

    return stats;
  } else {
    console.log("[JobCollector] Round-Robin Sync: No target companies configured.");
    return { inserted: 0, updated: 0 };
  }
}
