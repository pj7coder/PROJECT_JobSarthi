import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

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
export async function fetchAshbyJobs(boardId) {
  console.log(`[Ashby] Fetching jobs for board: ${boardId}`);
  // Using public board api endpoint
  const url = `https://api.ashbyhq.com/v1/iframe/web/${boardId}/jobs`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ashby API status: ${res.status}`);
    const data = await res.json();
    const jobsList = data.jobs || data.postings || [];
    return jobsList.map(job => ({
      source_id: job.id || job.jobId,
      source: "ashby",
      title: job.title,
      company: job.companyName || "Partner Company",
      location: job.location || "Remote",
      department: job.department || "General",
      employment_type: job.employmentType || "Full-time",
      description: job.descriptionHtml || job.description || "No description provided.",
      skills: extractSkillsFromText(job.description || ""),
      salary: job.compensationInfo ? job.compensationInfo.summary : "Not specified",
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

// --- MAIN PIPELINE PIPELINE PIPELINE PIPELINE ---
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
        const fetched = await fetchAshbyJobs(entry.token);
        allCollectedJobs.push(...fetched);
      } else if (entry.ats === "smartrecruiters") {
        const fetched = await fetchSmartRecruitersJobs(entry.token);
        allCollectedJobs.push(...fetched);
      } else {
        // Career Page Flow
        const result = await scrapeCareerPage(entry.name, entry.url);
        if (result.atsDetected) {
          console.log(`[JobCollector] Redirecting company ${entry.name} to detected ATS: ${result.atsDetected}`);
          // Auto route to ATS
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

  console.log(`[JobCollector] Normalizing and de-duplicating ${allCollectedJobs.length} collected jobs...`);
  
  const db = await getDB();
  let insertedCount = 0;
  let updatedCount = 0;

  if (db) {
    // Write to MongoDB
    for (const job of allCollectedJobs) {
      const jobId = generateJobId(job.company, job.title, job.location);
      const query = { id: jobId };
      
      const normalizedJob = {
        id: jobId,
        title: job.title,
        company: job.company,
        logo: "🌐",
        category: job.department || "Software Engineering",
        type: job.employment_type || "Full-time",
        location: job.location || "Remote",
        salary: job.salary || "Not specified",
        match: Math.floor(Math.random() * 25) + 75,
        description: job.description,
        skills: job.skills || "General tech skills",
        reqs: [
          "Demonstrated project experience.",
          "Solid knowledge of core engineering principles.",
          "Strong communication and collaborative alignment."
        ],
        applyUrl: job.apply_url,
        source: job.source,
        source_id: job.source_id,
        posted_date: job.posted_date || new Date(),
        updated_at: new Date()
      };

      const existing = await db.collection("jobs").findOne(query);
      if (existing) {
        await db.collection("jobs").updateOne(query, { $set: normalizedJob });
        updatedCount++;
      } else {
        normalizedJob.created_at = new Date();
        await db.collection("jobs").insertOne(normalizedJob);
        insertedCount++;
      }
    }
  } else {
    // Write to Local db.json
    const local = await readLocalDB();
    if (!local.jobs) local.jobs = [];

    for (const job of allCollectedJobs) {
      const jobId = generateJobId(job.company, job.title, job.location);
      
      const normalizedJob = {
        id: jobId,
        title: job.title,
        company: job.company,
        logo: "🌐",
        category: job.department || "Software Engineering",
        type: job.employment_type || "Full-time",
        location: job.location || "Remote",
        salary: job.salary || "Not specified",
        match: Math.floor(Math.random() * 25) + 75,
        description: job.description,
        skills: job.skills || "General tech skills",
        reqs: [
          "Demonstrated project experience.",
          "Solid knowledge of core engineering principles.",
          "Strong communication and collaborative alignment."
        ],
        applyUrl: job.apply_url,
        source: job.source,
        source_id: job.source_id,
        posted_date: job.posted_date || new Date(),
        updated_at: new Date()
      };

      const existingIdx = local.jobs.findIndex(j => j.id === jobId);
      if (existingIdx !== -1) {
        local.jobs[existingIdx] = { ...local.jobs[existingIdx], ...normalizedJob };
        updatedCount++;
      } else {
        normalizedJob.created_at = new Date();
        local.jobs.unshift(normalizedJob);
        insertedCount++;
      }
    }
    await writeLocalDB(local);
  }

  console.log(`[JobCollector] Pipeline finished. New Inserted: ${insertedCount}, Updated: ${updatedCount}`);
  return { inserted: insertedCount, updated: updatedCount };
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

// Global curated list of target tech companies
export const TARGET_COMPANIES = [
  { name: "Figma", url: "https://careers.figma.com", ats: "greenhouse", token: "figma" },
  { name: "Vercel", url: "https://vercel.com/careers", ats: "lever", token: "vercel" },
  { name: "Airbnb", url: "https://careers.airbnb.com", ats: "greenhouse", token: "airbnb" },
  { name: "Netflix", url: "https://jobs.netflix.com", ats: "lever", token: "netflix" },
  { name: "Stripe", url: "https://stripe.com/jobs", ats: "greenhouse", token: "stripe" },
  { name: "Sentry", url: "https://sentry.io/careers", ats: "lever", token: "sentry" },
  { name: "Uber", url: "https://www.uber.com/careers", ats: "greenhouse", token: "uber" },
  { name: "Spotify", url: "https://www.lifeatspotify.com", ats: "lever", token: "spotify" },
  { name: "Lyft", url: "https://www.lyft.com/careers", ats: "greenhouse", token: "lyft" },
  { name: "Slack", url: "https://slack.com/careers", ats: "lever", token: "slack" },
  { name: "Pinterest", url: "https://careers.pinterest.com", ats: "greenhouse", token: "pinterest" },
  { name: "Cloudflare", url: "https://www.cloudflare.com/careers", ats: "greenhouse", token: "cloudflare" },
  { name: "Datadog", url: "https://www.datadoghq.com/careers", ats: "greenhouse", token: "datadog" },
  { name: "Zoom", url: "https://careers.zoom.us", ats: "greenhouse", token: "zoom" },
  { name: "Robinhood", url: "https://careers.robinhood.com", ats: "greenhouse", token: "robinhood" },
  { name: "Reddit", url: "https://www.redditinc.com/careers", ats: "greenhouse", token: "reddit" },
  { name: "Asana", url: "https://asana.com/jobs", ats: "lever", token: "asana" },
  { name: "Medium", url: "https://medium.jobs", ats: "lever", token: "medium" },
  { name: "Coursera", url: "https://about.coursera.org/careers", ats: "lever", token: "coursera" },
  { name: "Linear", url: "https://ashbyhq.com/linear", ats: "ashby", token: "linear" },
  { name: "Retool", url: "https://retool.com/careers", ats: "ashby", token: "retool" },
  { name: "Clerk", url: "https://clerk.com/careers", ats: "ashby", token: "clerk" }
];

// Round-robin selector to fetch 1 company per hour
export async function syncNextCompany() {
  const db = await getDB();
  const companyLastUpdated = {};

  try {
    if (db) {
      const jobs = await db.collection("jobs").find({}, { projection: { company: 1, updated_at: 1 } }).toArray();
      jobs.forEach(job => {
        const cName = job.company.toLowerCase();
        const date = new Date(job.updated_at || 0).getTime();
        if (!companyLastUpdated[cName] || date > companyLastUpdated[cName]) {
          companyLastUpdated[cName] = date;
        }
      });
    } else {
      const local = await readLocalDB();
      (local.jobs || []).forEach(job => {
        const cName = job.company.toLowerCase();
        const date = new Date(job.updated_at || 0).getTime();
        if (!companyLastUpdated[cName] || date > companyLastUpdated[cName]) {
          companyLastUpdated[cName] = date;
        }
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
    return await runJobCollectionPipeline([chosenCompany]);
  } else {
    console.log("[JobCollector] Round-Robin Sync: No target companies configured.");
    return { inserted: 0, updated: 0 };
  }
}
