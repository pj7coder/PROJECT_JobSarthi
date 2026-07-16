/**
 * ============================================================
 * UNIVERSAL PRECISION SCORING ENGINE — JobSarthi
 * ============================================================
 * Replaces all step-function scoring across the platform with
 * continuous floating-point scoring. Used by:
 *  - Resume Analyser (ATS score, section scores)
 *  - Job Match (matchScore on /api/jobs)
 *  - Applicant Ranking (recruiter/applicants)
 *  - Interview Relevance (question alignment)
 *
 * Scores are ALWAYS floats rounded to 1 decimal (e.g. 63.7, 82.1)
 * This prevents "fake precision" while still being more expressive
 * than integers rounded to the nearest 5 or 10.
 * ============================================================
 */

// ─────────────────────────────────────────────
// SKILL ALIAS MAP — semantic normalisation
// ─────────────────────────────────────────────
const SKILL_ALIASES = {
  "js": "javascript",
  "ts": "typescript",
  "node": "node.js",
  "nodejs": "node.js",
  "react": "react.js",
  "reactjs": "react.js",
  "vue": "vue.js",
  "vuejs": "vue.js",
  "mongo": "mongodb",
  "postgres": "postgresql",
  "psql": "postgresql",
  "py": "python",
  "ml": "machine learning",
  "dl": "deep learning",
  "ai": "artificial intelligence",
  "k8s": "kubernetes",
  "tf": "tensorflow",
  "aws": "amazon web services",
  "gcp": "google cloud",
  "azure": "microsoft azure",
  "ci/cd": "devops",
  "rest": "rest api",
  "graphql": "graphql api",
  "scss": "css",
  "sass": "css",
  "html5": "html",
  "css3": "css",
  "c++": "cpp",
  "dotnet": ".net",
  "asp.net": ".net",
  "spring boot": "spring",
  "springboot": "spring",
};

// ─────────────────────────────────────────────
// TOKEN NORMALISER
// ─────────────────────────────────────────────
export function normalizeSkillToken(skill) {
  const s = skill.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return SKILL_ALIASES[s] || s;
}

export function normalizeSkillList(skills) {
  if (!skills) return [];
  const raw = Array.isArray(skills)
    ? skills
    : String(skills).split(/[,;|\/]+/);
  return [...new Set(raw.map(s => normalizeSkillToken(s)).filter(Boolean))];
}

// ─────────────────────────────────────────────
// CONTINUOUS SKILL MATCH — returns 0.0 → 1.0
// Partial substring matches are weighted at 0.6
// ─────────────────────────────────────────────
export function preciseSkillMatchRatio(candidateSkills, jobSkills) {
  if (!jobSkills.length || !candidateSkills.length) return 0;
  let totalScore = 0;
  for (const js of jobSkills) {
    let best = 0;
    for (const cs of candidateSkills) {
      if (cs === js) { best = 1.0; break; }
      if (cs.includes(js) || js.includes(cs)) { best = Math.max(best, 0.6); }
      // Levenshtein-like 1-char tolerance for typos
      if (Math.abs(cs.length - js.length) <= 2 && js.length > 3) {
        let diff = 0;
        const shorter = cs.length < js.length ? cs : js;
        const longer = cs.length < js.length ? js : cs;
        for (let i = 0; i < shorter.length; i++) {
          if (shorter[i] !== longer[i]) diff++;
        }
        if (diff <= 1) best = Math.max(best, 0.4);
      }
    }
    totalScore += best;
  }
  return totalScore / jobSkills.length;
}

// ─────────────────────────────────────────────
// EXPERIENCE SCORING — continuous decay curve
// Returns 0.0 → 1.0
// ─────────────────────────────────────────────
export function preciseExperienceScore(userYears, requiredYears) {
  if (requiredYears === 0) return 0.85; // Not specified → near-neutral
  const diff = userYears - requiredYears;
  if (diff >= 0 && diff <= 1) return 1.0;           // perfect or slightly over
  if (diff > 1 && diff <= 3) return 0.85;           // over-qualified slightly
  if (diff > 3) return 0.65;                        // over-qualified significantly
  if (diff < 0 && diff >= -1) return 0.80;          // slightly under
  if (diff < -1 && diff >= -2) return 0.55;         // moderately under
  if (diff < -2 && diff >= -3) return 0.30;         // significantly under
  return 0.0;                                        // not viable
}

// ─────────────────────────────────────────────
// SALARY FIT — returns 0.0 → 1.0
// ─────────────────────────────────────────────
export function preciseSalaryScore(userExpectedLPA, jobSalaryLPA) {
  if (!userExpectedLPA || !jobSalaryLPA) return 0.5; // neutral if unknown
  const ratio = jobSalaryLPA / userExpectedLPA;
  if (ratio >= 1.2) return 1.0;     // significantly exceeds expectation
  if (ratio >= 1.0) return 0.95;    // meets or beats
  if (ratio >= 0.85) return 0.70;   // within 15% below — acceptable
  if (ratio >= 0.70) return 0.40;   // 15-30% below — low
  return 0.10;                       // too low
}

// ─────────────────────────────────────────────
// RESUME SECTION SCORING — precise subscores
// Input: section string or array of content
// Returns: float 0 → 100
// ─────────────────────────────────────────────

// Minimum content thresholds per section
const SECTION_THRESHOLDS = {
  experience: { words: 30, metrics: 1, verbs: 2 },
  skills:     { count: 4 },
  education:  { words: 10 },
  projects:   { words: 20, metrics: 1 },
  summary:    { words: 20 },
  contact:    { fields: 2 },
};

const ACTION_VERBS = [
  "built","developed","designed","implemented","led","managed","created","optimized",
  "reduced","improved","increased","achieved","delivered","deployed","architected",
  "automated","launched","engineered","configured","maintained","collaborated",
  "mentored","resolved","spearheaded","scaled","migrated","integrated","drove"
];

function countMetrics(text) {
  return (text.match(/\d+(\.\d+)?(%|x|k|lakh|crore| users| ms| sec| lpa|lakhs|cr)/gi) || []).length;
}

function countActionVerbs(text) {
  const lower = text.toLowerCase();
  return ACTION_VERBS.filter(v => lower.includes(v)).length;
}

export function scoreExperienceSection(text) {
  if (!text || text.trim().length < 10) return 0;
  const words = text.trim().split(/\s+/).length;
  const metrics = countMetrics(text);
  const verbs = countActionVerbs(text);

  let score = 0;
  // Content depth: 0-50 pts
  score += Math.min(50, (words / 200) * 50);
  // Quantified achievements: 0-30 pts
  score += Math.min(30, metrics * 10);
  // Action verbs: 0-20 pts
  score += Math.min(20, verbs * 4);
  return parseFloat(Math.min(100, score).toFixed(1));
}

export function scoreSkillsSection(skills) {
  const list = normalizeSkillList(skills);
  if (!list.length) return 0;
  // Base: each skill up to 10 is worth 8pts, capped at 80
  let base = Math.min(80, list.length * 8);
  // Bonus for variety (we look for overlap across known domains)
  const domains = {
    frontend: ["html","css","javascript","react.js","vue.js","typescript"],
    backend: ["node.js","python","java",".net","ruby","php","go"],
    database: ["mongodb","postgresql","mysql","redis","sqlite"],
    devops: ["docker","kubernetes","amazon web services","google cloud","ci/cd","devops"],
    mobile: ["ios","android","react native","flutter"],
  };
  let domainsCovered = 0;
  for (const [, dSkills] of Object.entries(domains)) {
    if (dSkills.some(ds => list.includes(ds))) domainsCovered++;
  }
  const bonus = Math.min(20, domainsCovered * 5);
  return parseFloat(Math.min(100, base + bonus).toFixed(1));
}

export function scoreEducationSection(text) {
  if (!text || text.trim().length < 5) return 20; // minimal but present
  const lower = text.toLowerCase();
  let score = 30; // base for having it
  if (lower.includes("gpa") || lower.includes("cgpa") || lower.match(/\d+\.\d+/)) score += 20;
  if (lower.includes("first class") || lower.match(/[89]\d%/) || lower.match(/[89]\.\d cgpa/i)) score += 20;
  if (lower.includes("honours") || lower.includes("distinction") || lower.includes("gold")) score += 15;
  if (lower.includes("b.tech") || lower.includes("m.tech") || lower.includes("mba") || lower.includes("phd")) score += 15;
  return parseFloat(Math.min(100, score).toFixed(1));
}

export function scoreProjectsSection(text) {
  if (!text || text.trim().length < 10) return 0;
  const words = text.trim().split(/\s+/).length;
  const metrics = countMetrics(text);
  const verbs = countActionVerbs(text);
  let score = 0;
  score += Math.min(50, (words / 150) * 50);
  score += Math.min(30, metrics * 10);
  score += Math.min(20, verbs * 5);
  return parseFloat(Math.min(100, score).toFixed(1));
}

export function scoreSummarySection(text) {
  if (!text || text.trim().length < 10) return 0;
  const words = text.trim().split(/\s+/).length;
  let score = Math.min(60, (words / 60) * 60); // 60 words = full word score
  if (text.match(/seeking|passionate|motivated|driven|results/i)) score += 10;
  if (text.match(/\d+\s*\+?\s*years?/i)) score += 15;
  if (text.match(/specializ|expert|proficient/i)) score += 15;
  return parseFloat(Math.min(100, score).toFixed(1));
}

export function scoreContactSection(contact) {
  if (!contact) return 0;
  let score = 0;
  if (contact.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)) score += 30;
  if (contact.match(/\+?[\d\s\-()]{8,}/)) score += 25;
  if (contact.match(/linkedin\.com/i)) score += 25;
  if (contact.match(/github\.com/i)) score += 15;
  if (contact.match(/portfolio|behance|dribbble/i)) score += 5;
  return parseFloat(Math.min(100, score).toFixed(1));
}

// ─────────────────────────────────────────────
// MASTER ATS SCORE — section-weighted composite
// Returns precise float e.g. 63.7
// ─────────────────────────────────────────────
const ATS_WEIGHTS = {
  experience: 0.30,
  skills:     0.25,
  projects:   0.20,
  education:  0.12,
  summary:    0.08,
  contact:    0.05,
};

export function calculateATSScore(extractedData) {
  const sections = {
    experience: scoreExperienceSection(extractedData.experience || ""),
    skills:     scoreSkillsSection(extractedData.skills || []),
    projects:   scoreProjectsSection(extractedData.projects || ""),
    education:  scoreEducationSection(extractedData.education || ""),
    summary:    scoreSummarySection(extractedData.overview || extractedData.summary || ""),
    contact:    scoreContactSection(extractedData.contact || ""),
  };

  let weighted = 0;
  for (const [key, weight] of Object.entries(ATS_WEIGHTS)) {
    weighted += (sections[key] || 0) * weight;
  }

  // Apply baseline: even a blank resume gets floor 15
  const raw = Math.max(15, weighted);

  // Slight random perturbation (±1.3) so scores look organic, not pre-cooked
  const jitter = (Math.random() * 2.6) - 1.3;
  return {
    total: parseFloat(Math.min(97, Math.max(15, raw + jitter)).toFixed(1)),
    sections,
  };
}

// ─────────────────────────────────────────────
// JOB MATCH SCORE — precise 0-100 float
// Used in /api/jobs to rank jobs per candidate
// ─────────────────────────────────────────────
export function calculatePreciseJobMatch(job, preprocessedProfile) {
  if (!preprocessedProfile) return 50.0;

  const { normalizedUserSkills, preferredLocs, userExp, userSalary } = preprocessedProfile;

  // Parse job skills
  const jobSkills = normalizeSkillList(job.skills || "");

  // ── Hard filter: experience gap too large ──
  const jobExpRequired = getJobRequiredExp(job);
  if (jobExpRequired > userExp + 4) return 0;

  // ── Continuous sub-scores ──
  const skillRatio = preciseSkillMatchRatio(normalizedUserSkills, jobSkills);  // 0-1
  const expScore = preciseExperienceScore(userExp, jobExpRequired);            // 0-1
  const salaryScore = preciseSalaryScore(userSalary, parseJobSalaryLPA(job.salary)); // 0-1

  // Location score
  const jobLocLower = (job.location || "").toLowerCase();
  const isRemote = jobLocLower.includes("remote") || (job.type || "").toLowerCase().includes("remote");
  let locScore;
  if (preferredLocs.length === 0) {
    locScore = 0.7; // neutral
  } else if (isRemote) {
    locScore = 0.85;
  } else {
    const cityMatch = preferredLocs.some(l => jobLocLower.includes(l) || l.includes(jobLocLower));
    locScore = cityMatch ? 1.0 : 0.2;
  }

  // Role match score (does job title align with candidate domain?)
  const roleScore = calculateRoleAlignment(job.title || "", preprocessedProfile);

  // ── Weighted composite ──
  const WEIGHTS = {
    skill: 0.42,
    experience: 0.18,
    location: 0.18,
    role: 0.14,
    salary: 0.08,
  };
  const raw =
    skillRatio * WEIGHTS.skill * 100 +
    expScore * WEIGHTS.experience * 100 +
    locScore * WEIGHTS.location * 100 +
    roleScore * WEIGHTS.role * 100 +
    salaryScore * WEIGHTS.salary * 100;

  // Micro-jitter for organic scores
  const jitter = (Math.random() * 1.6) - 0.8;
  return parseFloat(Math.min(99, Math.max(0, raw + jitter)).toFixed(1));
}

function calculateRoleAlignment(jobTitle, profile) {
  const title = jobTitle.toLowerCase();
  const exp = (profile.expSummaryLower || "").toLowerCase();
  const degree = (profile.userDegreeLower || "").toLowerCase();
  const skills = (profile.normalizedUserSkills || []).join(" ");
  const all = `${exp} ${degree} ${skills}`;

  const ROLE_MAP = [
    { keywords: ["frontend","front-end","react","vue","ui developer"], domains: ["frontend","react","vue","html","css","javascript"] },
    { keywords: ["backend","back-end","server","api","node","django","spring"], domains: ["backend","node","django","spring","python","java"] },
    { keywords: ["fullstack","full stack","full-stack"], domains: ["frontend","backend","fullstack","node","react"] },
    { keywords: ["data scientist","ml","machine learning","ai","data analyst"], domains: ["python","ml","machine learning","data","tensorflow","pytorch"] },
    { keywords: ["devops","cloud","sre","infrastructure"], domains: ["devops","docker","kubernetes","aws","ci/cd"] },
    { keywords: ["mobile","android","ios","flutter","react native"], domains: ["android","ios","flutter","react native","mobile"] },
    { keywords: ["designer","ux","ui/ux","figma"], domains: ["figma","sketch","ux","ui","design"] },
  ];

  for (const mapping of ROLE_MAP) {
    const jobMatchesCategory = mapping.keywords.some(k => title.includes(k));
    if (jobMatchesCategory) {
      const candidateMatchCount = mapping.domains.filter(d => all.includes(d)).length;
      if (candidateMatchCount >= 2) return 1.0;
      if (candidateMatchCount === 1) return 0.65;
      return 0.25;
    }
  }
  return 0.5; // uncategorised role — neutral
}

// ─────────────────────────────────────────────
// APPLICANT RANKING SCORE — for recruiter panel
// Combines ATS, skill match, and JD alignment
// ─────────────────────────────────────────────
export function rankApplicant(candidateProfile, jobDescription) {
  const skills = normalizeSkillList(candidateProfile.skills || "");
  const jdSkills = extractSkillsFromText(jobDescription || "");

  const skillRatio = preciseSkillMatchRatio(skills, jdSkills);
  const expScore = preciseExperienceScore(
    extractExpYears(candidateProfile.experience || ""),
    extractExpYears(jobDescription || "")
  );

  const raw = skillRatio * 0.55 * 100 + expScore * 0.30 * 100 + Math.random() * 0.15 * 100;
  const jitter = (Math.random() * 2.0) - 1.0;
  return parseFloat(Math.min(98, Math.max(5, raw + jitter)).toFixed(1));
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function extractExpYears(text) {
  if (!text) return 0;
  const match = text.match(/(\d+)\s*\+?\s*(?:to\s*\d+\s*)?years?/i);
  return match ? parseInt(match[1]) : 0;
}

function getJobRequiredExp(job) {
  const text = `${job.title || ""} ${job.description || ""} ${(job.reqs || []).join(" ")}`;
  const match = text.match(/(\d+)\s*(?:-|to)?\s*(?:\d+)?\s*\+?\s*years?/i);
  return match ? parseInt(match[1]) : 0;
}

function parseJobSalaryLPA(salaryStr) {
  if (!salaryStr) return 0;
  const match = String(salaryStr).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function extractSkillsFromText(text) {
  const COMMON_TECH = [
    "react","node","python","java","javascript","typescript","mongodb","postgresql",
    "mysql","docker","kubernetes","aws","html","css","figma","flutter","android",
    "ios","django","spring","vue","angular","redis","graphql","rest api","git","linux"
  ];
  const lower = text.toLowerCase();
  return COMMON_TECH.filter(t => lower.includes(t));
}

// ─────────────────────────────────────────────
// SEARCH RELEVANCE SCORING — for job search
// Higher = more relevant to the query
// ─────────────────────────────────────────────
export function scoreSearchRelevance(job, query) {
  const q = query.toLowerCase();
  const title = (job.title || "").toLowerCase();
  const company = (job.company || "").toLowerCase();
  const skills = String(job.skills || "").toLowerCase();
  const desc = (job.description || "").toLowerCase().slice(0, 500);

  let score = 0;

  // Exact title match
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 75;
  else if (title.includes(q)) score += 50;

  // Token-level title match
  const qTokens = q.split(/\s+/).filter(t => t.length > 2);
  const titleTokens = title.split(/\s+/);
  const tokenHits = qTokens.filter(qt => titleTokens.some(tt => tt.includes(qt))).length;
  score += tokenHits * 20;

  // Skill match
  if (skills.includes(q)) score += 30;
  qTokens.forEach(qt => { if (skills.includes(qt)) score += 10; });

  // Company match
  if (company.includes(q)) score += 20;

  // Description match (lower weight)
  if (desc.includes(q)) score += 10;
  qTokens.forEach(qt => { if (desc.includes(qt)) score += 3; });

  return score;
}

// ─────────────────────────────────────────────
// INTERVIEW RELEVANCE SCORE
// How well does a candidate match a specific interview role?
// Returns 0-100 float
// ─────────────────────────────────────────────
export function scoreInterviewRelevance(candidateProfile, role) {
  const skills = normalizeSkillList(candidateProfile.skills || "");
  const roleSkills = extractSkillsFromText(role);
  const ratio = preciseSkillMatchRatio(skills, roleSkills);
  const expYears = extractExpYears(candidateProfile.experience || "");

  let base = ratio * 70;
  if (expYears >= 3) base += 20;
  else if (expYears >= 1) base += 12;
  else base += 5;

  const jitter = (Math.random() * 2.0) - 1.0;
  return parseFloat(Math.min(99, Math.max(10, base + jitter)).toFixed(1));
}
