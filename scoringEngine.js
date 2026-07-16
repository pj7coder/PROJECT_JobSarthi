/**
 * ============================================================
 * UNIVERSAL PRECISION SCORING ENGINE — JobSarthi
 * ============================================================
 * Replaces all float-based scoring across the platform with
 * robust, rounded integer-based scoring (1 to 100). Used by:
 *  - Resume Analyser (ATS score, section scores)
 *  - Job Match (matchScore on /api/jobs)
 *  - Applicant Ranking (recruiter/applicants)
 *  - Interview Relevance (question alignment)
 *
 * Scores are ALWAYS integers rounded to the nearest whole number.
 * ============================================================
 */

// ─────────────────────────────────────────────
// SKILL SYNONYMS MAP — semantic normalisation
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
  "angularjs": "angular",
  "angular": "angular",
  "mongo": "mongodb",
  "mongodb": "mongodb",
  "postgres": "postgresql",
  "postgresql": "postgresql",
  "psql": "postgresql",
  "py": "python",
  "python": "python",
  "ml": "machine learning",
  "machinelearning": "machine learning",
  "dl": "deep learning",
  "deeplearning": "deep learning",
  "ai": "artificial intelligence",
  "artificialintelligence": "artificial intelligence",
  "k8s": "kubernetes",
  "kubernetes": "kubernetes",
  "docker": "docker",
  "tf": "tensorflow",
  "tensorflow": "tensorflow",
  "aws": "amazon web services",
  "amazonwebservices": "amazon web services",
  "gcp": "google cloud",
  "googlecloud": "google cloud",
  "azure": "microsoft azure",
  "microsoftazure": "microsoft azure",
  "ci/cd": "ci-cd",
  "cicd": "ci-cd",
  "rest": "rest api",
  "restful": "rest api",
  "graphql": "graphql",
  "scss": "css",
  "sass": "css",
  "css3": "css",
  "html5": "html",
  "cpp": "c++",
  "cplusplus": "c++",
  "c#": "csharp",
  "dotnet": ".net",
  "aspnet": ".net",
  "springboot": "spring boot",
  "spring": "spring boot",
  "golang": "go",
  "reactnative": "react native",
  "nextjs": "next.js",
  "tailwindcss": "tailwind css",
  "tailwind": "tailwind css",
  "powerbi": "power bi",
  "power-bi": "power bi",
  "excel": "microsoft excel",
  "ms-excel": "microsoft excel",
  "msexcel": "microsoft excel"
};

// ─────────────────────────────────────────────
// SKILL CLUSTERS — semantic taxonomy mapping
// ─────────────────────────────────────────────
const SKILL_CLUSTERS = [
  {
    name: "frontend",
    skills: ["html", "css", "javascript", "typescript", "react.js", "vue.js", "angular", "next.js", "tailwind css", "sass", "bootstrap", "svelte", "ui/ux", "figma", "jquery", "webgl", "three.js", "redux", "webpack", "vite"]
  },
  {
    name: "backend",
    skills: ["node.js", "express", "koa", "nest.js", "python", "django", "flask", "fastapi", "java", "spring boot", "go", "golang", "ruby", "ruby on rails", "php", "laravel", ".net", "c#", "csharp", "asp.net", "graphql", "apollo", "microservices", "gprc"]
  },
  {
    name: "database",
    skills: ["mongodb", "postgresql", "mysql", "redis", "sqlite", "cassandra", "dynamodb", "oracle", "sql server", "firebase", "sql", "mariadb", "neo4j", "prisma", "sequelize", "mongoose"]
  },
  {
    name: "devops_cloud",
    skills: ["docker", "kubernetes", "amazon web services", "google cloud", "microsoft azure", "ci-cd", "jenkins", "terraform", "ansible", "nginx", "linux", "git", "github", "gitlab", "bitbucket", "prometheus", "grafana", "elk", "datadog"]
  },
  {
    name: "mobile",
    skills: ["react native", "flutter", "swift", "kotlin", "android", "ios", "java", "objective-c", "xcode", "gradle"]
  },
  {
    name: "data_ml",
    skills: ["python", "r", "sql", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras", "rag", "llm", "openai", "deep learning", "machine learning", "artificial intelligence", "nlp", "power bi", "tableau", "spark", "hadoop", "databricks", "matlab", "opencv", "computer vision"]
  },
  {
    name: "design",
    skills: ["figma", "adobe xd", "photoshop", "illustrator", "sketch", "ui/ux", "wireframing", "canva", "invision"]
  },
  {
    name: "qa_testing",
    skills: ["jest", "mocha", "cypress", "selenium", "playwright", "testing", "unit testing", "integration testing", "qa", "manual testing", "automation", "postman"]
  }
];

// Local sets of lower-case states and cities to resolve location references
const INDIAN_STATES_LOWER = new Set([
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", "haryana", 
  "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur", 
  "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", 
  "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi", "chandigarh", "puducherry", "jammu and kashmir"
]);

const INDIAN_CITIES_LOWER = new Set([
  "bangalore", "bengaluru", "mumbai", "pune", "hyderabad", "chennai", "noida", "gurgaon", "gurugram", 
  "new delhi", "delhi", "kolkata", "ahmedabad", "surat", "jaipur", "lucknow", "kanpur", "nagpur", 
  "indore", "thane", "bhopal", "visakhapatnam", "pimpri-chinchwad", "patna", "vadodara", "ghaziabad", 
  "ludhiana", "agra", "nashik", "faridabad", "meerut", "rajkot", "kalyan-dombivli", "vasai-virar", 
  "varanasi", "srinagar", "aurangabad", "dhanbad", "amritsar", "navi mumbai", "allahabad", "ranchi", 
  "howrah", "coimbatore", "jabalpur", "gwalior", "vijayawada", "jodhpur", "madurai", "raipur", 
  "kota", "guwahati", "solapur", "hubli-dharwad", "bareilly", "moradabad", "mysore", "aligarh", 
  "jalandhar", "tiruchirappalli", "bhubaneswar", "salem", "mira-bhayandar", "thiruvananthapuram", 
  "bhiwandi", "saharanpur", "gorakhpur", "guntur", "bikaner", "amravati", "jamshedpur", "bhilai", 
  "cuttack", "firozabad", "kochi", "nellore", "bhavnagar", "dehradun", "durgapur", "asansol", 
  "rourkela", "nanded", "kolhapur", "ajmer", "akola", "gulbarga", "jamnagar", "ujjain", "loni", 
  "siliguri", "jhansi", "ulhasnagar", "jammu", "sangli-miraj & kupwad", "belgaum", "mangalore", 
  "ambattur", "tirunelveli", "malegaon", "gaya", "jalgaon", "udaipur", "maheshtala"
]);

// ─────────────────────────────────────────────
// JARO-WINKLER TYPO TOLERANCE ALGORITHM
// ─────────────────────────────────────────────
function jaroWinklerDistance(s1, s2) {
  s1 = s1.toLowerCase().trim();
  s2 = s2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(len2, i + matchWindow + 1);
    for (let j = start; j < end; j++) {
      if (!matches2[j] && s1[i] === s2[j]) {
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
  }
  
  if (matches === 0) return 0.0;
  
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (matches1[i]) {
      while (!matches2[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0;
  
  // Winkler modification for common prefix weight
  let prefixLength = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(len1, len2, maxPrefix); i++) {
    if (s1[i] === s2[i]) prefixLength++;
    else break;
  }
  
  return jaro + prefixLength * 0.1 * (1.0 - jaro);
}

// ─────────────────────────────────────────────
// SEMANTIC SKILL SIMILARITY ASSESSOR
// ─────────────────────────────────────────────
export function getSemanticSkillSimilarity(cs, js) {
  const normCS = normalizeSkillToken(cs);
  const normJS = normalizeSkillToken(js);
  
  if (normCS === normJS) return 1.0;
  
  // Substring match checks
  if (normCS.includes(normJS) || normJS.includes(normCS)) {
    return 0.85;
  }
  
  // Typo tolerance Jaro-Winkler
  const jw = jaroWinklerDistance(normCS, normJS);
  if (jw >= 0.85) return jw;
  
  // Taxonomy overlap: check if they share a cluster category
  for (const cluster of SKILL_CLUSTERS) {
    if (cluster.skills.includes(normCS) && cluster.skills.includes(normJS)) {
      return 0.45; // Partially related skills within same technical field
    }
  }
  
  return 0.0;
}

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
// Weights core skills matching the JD title higher
// ─────────────────────────────────────────────
export function preciseSkillMatchRatio(candidateSkills, jobSkills, jobTitle = "") {
  if (!jobSkills.length) return 1.0; // No requirements listed -> complete match
  if (!candidateSkills.length) return 0.0; // Seeker has empty profile -> zero match
  
  const titleKeywords = jobTitle
    ? jobTitle.toLowerCase().split(/[\s,._\-()]+/).filter(k => k.length > 2)
    : [];
    
  let totalMatchWeighted = 0;
  let totalWeight = 0;
  
  for (const js of jobSkills) {
    // If the skill matches key words in the job title, it's a primary requirement
    let isCore = false;
    if (titleKeywords.length > 0) {
      const normJS = normalizeSkillToken(js);
      isCore = titleKeywords.some(tk => normJS.includes(tk) || tk.includes(normJS));
    }
    
    const weight = isCore ? 2.5 : 1.0;
    
    let bestMatch = 0;
    for (const cs of candidateSkills) {
      const sim = getSemanticSkillSimilarity(cs, js);
      if (sim > bestMatch) bestMatch = sim;
      if (bestMatch >= 1.0) break;
    }
    
    totalMatchWeighted += bestMatch * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? (totalMatchWeighted / totalWeight) : 0;
}

// ─────────────────────────────────────────────
// EXPERIENCE SCORING — continuous decay curve
// Returns 0.0 → 1.0
// ─────────────────────────────────────────────
export function preciseExperienceScore(userYears, requiredYears) {
  if (requiredYears === 0) return 0.85; 
  const diff = userYears - requiredYears;
  
  if (diff >= 0) {
    if (diff <= 2) return 1.0; // Perfect fit
    // Gentle overqualification scaling
    return Math.max(0.70, 1.0 - (diff - 2) * 0.05);
  } else {
    // Underqualified scaling
    const gap = Math.abs(diff);
    return Math.max(0.0, 1.0 - gap * 0.20);
  }
}

// ─────────────────────────────────────────────
// SALARY FIT — returns 0.0 → 1.0
// ─────────────────────────────────────────────
export function preciseSalaryScore(userExpectedLPA, jobSalaryLPA) {
  if (!userExpectedLPA || !jobSalaryLPA) return 0.8; // neutral
  const ratio = jobSalaryLPA / userExpectedLPA;
  if (ratio >= 1.0) {
    return Math.min(1.0, 0.95 + (ratio - 1.0) * 0.1);
  } else {
    return Math.max(0.1, 1.0 - (1.0 - ratio) * 2.0);
  }
}

// ─────────────────────────────────────────────
// RESUME SECTION SCORING — precise subscores
// Returns: integer 0 → 100
// ─────────────────────────────────────────────
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
  if (!text || text.trim().length < 8) return 0;

  const lower = text.toLowerCase();

  // ── Detect internship / fresher context markers first ──
  const isIntern   = /intern|trainee|apprentice|student.*work|work.*student/i.test(lower);
  const hasDates   = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|20\d{2}/i.test(lower);
  const hasCompany = /at\s+\w|@\s*\w|pantech|infosys|tcs|wipro|accenture|cognizant|company|organisation|organization|ltd|pvt|inc|corp|llp|llc/i.test(lower);

  // ── Extract months from date-range patterns like "January 2026 - April 2026 (4 months)" ──
  let months = 0;
  const rangeMonthsMatch = text.match(/(\d+)\s*month/i);
  if (rangeMonthsMatch) months = parseInt(rangeMonthsMatch[1]);

  // Try to derive months from explicit date ranges (e.g. Jan 2025 – Apr 2026)
  if (months === 0) {
    const MONTHS_MAP = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const dateRangeRe = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,]*(\d{4})\s*[-–—to]+\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,]*(\d{4})/gi;
    let dr;
    while ((dr = dateRangeRe.exec(lower)) !== null) {
      const [, sm, sy, em, ey] = dr;
      const start = parseInt(sy) * 12 + (MONTHS_MAP[sm] || 0);
      const end   = parseInt(ey) * 12 + (MONTHS_MAP[em] || 0);
      months = Math.max(months, end - start);
    }
  }

  // ── Extract explicit year count ──
  let years = 0;
  const yearMatch = text.match(/(\d+)\s*\+?\s*(year|yr)s?\b/i);
  if (yearMatch) {
    years = parseInt(yearMatch[1]);
  } else {
    const wordNumbers = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
      seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
    };
    const wordMatch = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(year|yr)s?\b/i);
    if (wordMatch) years = wordNumbers[wordMatch[1].toLowerCase()] || 0;
  }

  // Months → fractional years if no explicit year count
  if (years === 0 && months > 0) years = months / 12;

  // ── Base Score (fresher-aware) ──
  let baseScore;
  if      (years >= 15)                       baseScore = 78;
  else if (years >= 10)                       baseScore = 70;
  else if (years >= 5)                        baseScore = 62;
  else if (years >= 3)                        baseScore = 55;
  else if (years >= 2)                        baseScore = 50;
  else if (years >= 1)                        baseScore = 44;
  else if (months >= 6  || years >= 0.5)      baseScore = 42; // 6+ month internship — solid fresher
  else if (months >= 3  || years >= 0.25)     baseScore = 36; // 3-5 month internship
  else if (months >= 1)                       baseScore = 32; // < 3 month internship
  else if (isIntern || hasDates || hasCompany) baseScore = 30; // has some work mention
  else                                         baseScore = 22; // minimal text

  const words   = text.trim().split(/\s+/).length;
  const metrics = countMetrics(text);
  const verbs   = countActionVerbs(text);

  let score = baseScore;
  score += Math.min(20, (words / 80) * 20);  // word richness
  score += Math.min(15, metrics * 5);        // quantified impact
  score += Math.min(10, verbs * 2);          // action verbs
  if (hasDates)   score += 6;               // date anchors confirm reality
  if (hasCompany) score += 4;               // named company/org found
  if (isIntern)   score += 2;               // explicit internship label

  return Math.round(Math.min(100, score));
}

export function scoreSkillsSection(skills) {
  const list = normalizeSkillList(skills);
  if (!list.length) return 0; // return 0 if skills are missing or empty

  // Base: each skill adds 5 pts up to 50 (10 skills max on base)
  let score = Math.min(50, list.length * 5);

  // Domain variety bonus: cover more clusters = higher score
  let domainsCovered = 0;
  for (const cluster of SKILL_CLUSTERS) {
    if (cluster.skills.some(ds => list.some(ls => ls === ds || ls.includes(ds) || ds.includes(ls)))) {
      domainsCovered++;
    }
  }
  score += Math.min(30, domainsCovered * 8);

  // Baseline presentation bonus
  score += 20;
  return Math.round(Math.min(100, score));
}

export function scoreEducationSection(text) {
  if (!text || text.trim().length < 5) return 0;
  const lower = text.toLowerCase();

  // Baseline: just having education text is worth something
  let score = 30;

  // Degree level detection
  if (lower.match(/phd|doctorate|doctor of philosophy/i))                           score += 40;
  else if (lower.match(/master|m\.tech|mba|msc|m\.e\b|m\.s\b/i))                   score += 32;
  else if (lower.match(/bachelor|b\.tech|btech|b\.e\b|bsc|b\.sc|b\.s\b|undergraduate|engineering|technology/i)) score += 28;
  else if (lower.match(/diploma|polytechnic/i))                                     score += 18;
  else if (lower.match(/class\s+x{1,2}|10th|12th|ssc|hsc|intermediate|secondary/i)) score += 12;
  else if (lower.match(/university|college|institute|school/i))                     score += 10;

  // GPA / marks present (optional — don't penalise hard if absent)
  if (lower.includes("cgpa") || lower.includes("gpa"))      score += 12;
  else if (lower.match(/\d+\.\d+/))                         score += 6;  // decimal could be GPA
  else if (lower.match(/\d+\s*%/))                          score += 6;  // percentage marks

  // High achiever bonus
  if (lower.includes("first class") || lower.match(/[89]\d%/) || lower.match(/[89]\.\d/)) score += 8;
  if (lower.includes("honour") || lower.includes("distinction") || lower.includes("gold") || lower.includes("rank")) score += 6;

  // Multiple education entries (high school + college is common for freshers)
  const eduEntries = (lower.match(/\b(university|college|institute|school|public school|senior secondary)\b/gi) || []).length;
  if (eduEntries >= 2) score += 8;
  if (eduEntries >= 3) score += 4;

  // Year range present (e.g. 2021-2025) — confirms structured entry
  if (lower.match(/20\d{2}\s*[-–]\s*20\d{2}/)) score += 6;

  return Math.round(Math.min(100, score));
}

export function scoreProjectsSection(text, certifications = "") {
  // certifications can supplement project score for students/freshers
  const hasCerts = certifications && certifications.trim().length > 4;

  if (!text || text.trim().length < 8) {
    // No explicit projects — give partial credit if certifications exist
    if (hasCerts) {
      const certLower = certifications.toLowerCase();
      let certScore = 20; // baseline for cert-only candidates
      const certCount = (certifications.match(/\n|,|;/g) || []).length + 1;
      certScore += Math.min(20, certCount * 5);  // more certs = higher score
      const hasTechCert = /python|javascript|react|aws|azure|gcp|docker|machine learning|deep learning|cybersecurity|hacking|ai|ml|nlp|data|cloud|agile/i.test(certLower);
      if (hasTechCert) certScore += 15;
      return Math.round(Math.min(55, certScore)); // cap at 55 without actual projects
    }
    return 0;
  }

  const lower = text.toLowerCase();

  // If explicitly negative, give 0
  const isNegative = /^(not specified|none|n\/a|no projects?|nil)$/i.test(text.trim());
  if (isNegative) {
    // Still give cert credit
    return hasCerts ? 20 : 0;
  }

  const words   = text.trim().split(/\s+/).length;
  const metrics = countMetrics(text);
  const verbs   = countActionVerbs(text);

  // Structural project markers
  const hasProjectName = /project|built|developed|created|app|system|platform|tool|website|dashboard|chatbot|bot|api|pipeline|model|classifier/i.test(lower);
  const hasStack       = /using|with|via|built with|tech stack|python|javascript|react|node|java|flutter|tensorflow|pytorch|mongodb|sql|html|css/i.test(lower);
  const hasLinks       = /github|gitlab|live demo|deployed|hosted|production|vercel|netlify|heroku/i.test(lower);

  let score = 22; // baseline
  if (hasProjectName) score += 12;
  if (hasStack)       score += 10;
  if (hasLinks)       score += 8;  // bonus for deployed/linked projects
  score += Math.min(30, (words / 80) * 30);
  score += Math.min(12, metrics * 4);
  score += Math.min(8,  verbs * 2);

  // Partial credit from certs on top of projects
  if (hasCerts) score += 5;

  return Math.round(Math.min(100, score));
}

export function scoreSummarySection(text) {
  if (!text || text.trim().length < 8) return 0;
  const words = text.trim().split(/\s+/).length;

  let score = 30; // baseline — summary present
  score += Math.min(30, (words / 35) * 30);  // word richness
  if (text.match(/seeking|passionate|motivated|driven|results|dedicated|focused|experienced|aspiring|enthusiastic/i)) score += 12;
  if (text.match(/\d+\s*\+?\s*years?/i)) score += 12;
  if (text.match(/bachelor|master|degree|engineer|developer|analyst|designer|scientist|specialist/i)) score += 8;
  if (text.match(/intern|fresher|graduate|student|trainee/i)) score += 6; // student is a valid role
  if (text.match(/ai|machine learning|deep learning|data|cloud|web|mobile|cybersecurity/i)) score += 5; // tech domain mentioned

  return Math.round(Math.min(100, score));
}

export function scoreContactSection(contact) {
  if (!contact || contact.trim().length < 5) return 0;
  let score = 0;

  // Email — most critical
  if (contact.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)) score += 35;

  // Phone — Indian numbers (10 digits starting 6-9, or country-code 91XXXXXXXXXX)
  if (contact.match(/(\+?91[\s\-]?)?[6-9]\d{9}|\+?[\d][\d\s\-()]{7,}/)) score += 25;

  // LinkedIn — all common patterns
  if (contact.match(/linkedin\.com|linkedin\.in|\/in\/|linkedin/i)) score += 25;

  // GitHub — bonus
  if (contact.match(/github\.com|github/i)) score += 10;

  // Portfolio / personal site / other social
  if (contact.match(/portfolio|behance|dribbble|website|blog|twitter|leetcode/i)) score += 5;

  // Name / city present (implies structured contact block)
  if (contact.match(/india|rajasthan|delhi|bangalore|mumbai|pune|hyderabad|chennai|udaipur|jaipur/i)) score += 2;

  return Math.round(Math.min(100, score));
}

// ─────────────────────────────────────────────
// MASTER ATS SCORE — section-weighted composite
// Returns precise integer 15 → 100
// ─────────────────────────────────────────────
const ATS_WEIGHTS = {
  experience: 0.28,
  skills:     0.26,
  projects:   0.18,
  education:  0.14,
  summary:    0.08,
  contact:    0.06,
};

/**
 * calculateATSScore — computes section-level and composite ATS scores.
 * @param {object} extractedData - Must include: experience (string), skills (array|string),
 *   projects (string), education (string), overview/summary (string), contact (string).
 *   Optional: certifications (string) — used to award partial project credit for students.
 */
export function calculateATSScore(extractedData) {
  const certifications = extractedData.certifications || "";

  const sections = {
    experience: scoreExperienceSection(extractedData.experience || ""),
    skills:     scoreSkillsSection(extractedData.skills || []),
    projects:   scoreProjectsSection(extractedData.projects || "", certifications),
    education:  scoreEducationSection(extractedData.education || ""),
    summary:    scoreSummarySection(extractedData.overview || extractedData.summary || ""),
    contact:    scoreContactSection(extractedData.contact || ""),
  };

  let weighted = 0;
  for (const [key, weight] of Object.entries(ATS_WEIGHTS)) {
    weighted += (sections[key] || 0) * weight;
  }

  // Ensure a minimum floor of 15 for any uploaded document
  const raw = Math.max(15, weighted);

  return {
    total: Math.round(Math.min(100, Math.max(15, raw))),
    sections,
  };
}

// ─────────────────────────────────────────────
// PROFILE AUTOPREPROCESSOR
// ─────────────────────────────────────────────
export function preprocessProfileInternal(profile) {
  if (!profile) return {
    normalizedUserSkills: [],
    preferredLocs: [],
    userExp: 0,
    userSalary: 0,
    userInIndia: true,
    userDegreeLower: "",
    expSummaryLower: ""
  };

  let userSkills = [];
  if (Array.isArray(profile.skills)) {
    userSkills = profile.skills.map(s => s.trim().toLowerCase()).filter(Boolean);
  } else if (typeof profile.skills === 'string') {
    userSkills = profile.skills.split(/[,;|\/]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  const normalizedUserSkills = normalizeSkillList(userSkills);

  let preferredLocs = [];
  if (Array.isArray(profile.preferredLocations)) {
    preferredLocs = profile.preferredLocations.map(s => s.trim().toLowerCase()).filter(Boolean);
  } else if (typeof profile.preferredLocations === 'string') {
    preferredLocs = profile.preferredLocations.split(/[,;|\/]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  }

  // Extract years of experience
  let userExp = 0;
  if (profile.experience) {
    if (typeof profile.experience === 'number') {
      userExp = profile.experience;
    } else {
      const match = String(profile.experience).match(/(\d+)\s*(year|yr)/i);
      if (match) userExp = parseInt(match[1]);
      else {
        const numMatch = String(profile.experience).match(/\b(\d+)\b/);
        if (numMatch) userExp = parseInt(numMatch[1]);
      }
    }
  }

  // Parse expected CTC
  let userSalary = 0;
  if (profile.expectedCtc) {
    if (typeof profile.expectedCtc === 'number') {
      userSalary = profile.expectedCtc;
    } else {
      const match = String(profile.expectedCtc).match(/(\d+)\s*(LPA|lakh)/i);
      if (match) userSalary = parseInt(match[1]);
      else {
        const numMatch = String(profile.expectedCtc).match(/\b(\d+)\b/);
        if (numMatch) userSalary = parseInt(numMatch[1]);
      }
    }
  }

  const userInIndia = preferredLocs.length === 0 || preferredLocs.some(loc => 
    loc.includes("india") || 
    INDIAN_STATES_LOWER.has(loc) || 
    INDIAN_CITIES_LOWER.has(loc)
  );

  const userDegreeLower = (profile.degree || "").toLowerCase();
  const expSummaryLower = (profile.experience || "").toLowerCase();

  return {
    normalizedUserSkills,
    preferredLocs,
    userExp,
    userSalary,
    userInIndia,
    userDegreeLower,
    expSummaryLower
  };
}

// ─────────────────────────────────────────────
// JOB MATCH SCORE — precise 0-100 integer
// ─────────────────────────────────────────────
export function calculatePreciseJobMatch(job, profile) {
  if (!profile) return 50;

  const preprocessedProfile = ('normalizedUserSkills' in profile)
    ? profile
    : preprocessProfileInternal(profile);

  const { normalizedUserSkills, preferredLocs, userExp, userSalary, userInIndia, userDegreeLower, expSummaryLower } = preprocessedProfile;

  // Parse job skills
  let jobSkills = [];
  if (Array.isArray(job.skills)) {
    jobSkills = job.skills.map(s => s.trim().toLowerCase()).filter(Boolean);
  } else if (typeof job.skills === 'string') {
    jobSkills = job.skills.split(/[,;|\/]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  const normalizedJobSkills = jobSkills.map(s => normalizeSkillToken(s));

  // ── Hard filter: experience gap too large ──
  const jobExpRequired = getJobRequiredExp(job);
  if (jobExpRequired > userExp + 4) return 0;

  // ── Continuous sub-scores ──
  const skillRatio = preciseSkillMatchRatio(normalizedUserSkills, normalizedJobSkills, job.title || "");
  const expScore = preciseExperienceScore(userExp, jobExpRequired);
  const salaryScore = preciseSalaryScore(userSalary, parseJobSalaryLPA(job.salary));

  // Location score
  const jobLocLower = (job.location || "").toLowerCase();
  const isRemote = jobLocLower.includes("remote") || (job.type || "").toLowerCase().includes("remote");
  let locScore;
  if (preferredLocs.length === 0) {
    locScore = 0.85; // neutral
  } else if (isRemote) {
    locScore = 0.95;
  } else {
    const cityMatch = preferredLocs.some(l => jobLocLower.includes(l) || l.includes(jobLocLower));
    if (cityMatch) {
      locScore = 1.0;
    } else {
      const jobInIndia = jobLocLower.includes("india") || [...INDIAN_STATES_LOWER].some(s => jobLocLower.includes(s)) || [...INDIAN_CITIES_LOWER].some(c => jobLocLower.includes(c));
      locScore = (jobInIndia && userInIndia) ? 0.50 : 0.10;
    }
  }

  // Role match score
  const roleScore = calculateRoleAlignment(job.title || "", preprocessedProfile);

  // ── Weighted composite ──
  const WEIGHTS = {
    skill: 0.45,
    experience: 0.18,
    location: 0.15,
    role: 0.14,
    salary: 0.08,
  };
  const raw =
    skillRatio * WEIGHTS.skill * 100 +
    expScore * WEIGHTS.experience * 100 +
    locScore * WEIGHTS.location * 100 +
    roleScore * WEIGHTS.role * 100 +
    salaryScore * WEIGHTS.salary * 100;

  const jitter = (Math.random() * 3.0) - 1.5;
  return Math.round(Math.min(100, Math.max(1, raw + jitter)));
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
  return 0.5;
}

// ─────────────────────────────────────────────
// APPLICANT RANKING SCORE — for recruiter panel
// ─────────────────────────────────────────────
export function rankApplicant(candidateProfile, jobDescription) {
  const preprocessed = preprocessProfileInternal(candidateProfile);
  const jdSkills = extractSkillsFromText(jobDescription || "");
  const jdExp = extractExpYears(jobDescription || "");

  const skillRatio = preciseSkillMatchRatio(preprocessed.normalizedUserSkills, jdSkills);
  const expScore = preciseExperienceScore(preprocessed.userExp, jdExp);

  const raw = skillRatio * 0.60 * 100 + expScore * 0.40 * 100;
  const jitter = (Math.random() * 3.0) - 1.5;
  return Math.round(Math.min(100, Math.max(5, raw + jitter)));
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

// Helper to extract common tech skills from raw text descriptions
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
// ─────────────────────────────────────────────
export function scoreSearchRelevance(job, query) {
  const q = query.toLowerCase();
  const title = (job.title || "").toLowerCase();
  const company = (job.company || "").toLowerCase();
  const skills = String(job.skills || "").toLowerCase();
  const desc = (job.description || "").toLowerCase().slice(0, 500);

  let score = 0;

  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 75;
  else if (title.includes(q)) score += 50;

  const qTokens = q.split(/\s+/).filter(t => t.length > 2);
  const titleTokens = title.split(/\s+/);
  const tokenHits = qTokens.filter(qt => titleTokens.some(tt => tt.includes(qt))).length;
  score += tokenHits * 20;

  if (skills.includes(q)) score += 30;
  qTokens.forEach(qt => { if (skills.includes(qt)) score += 10; });

  if (company.includes(q)) score += 20;

  if (desc.includes(q)) score += 10;
  qTokens.forEach(qt => { if (desc.includes(qt)) score += 3; });

  return Math.round(score);
}

// ─────────────────────────────────────────────
// INTERVIEW RELEVANCE SCORE
// ─────────────────────────────────────────────
export function scoreInterviewRelevance(candidateProfile, role) {
  const preprocessed = preprocessProfileInternal(candidateProfile);
  const roleSkills = extractSkillsFromText(role);
  const ratio = preciseSkillMatchRatio(preprocessed.normalizedUserSkills, roleSkills, role);

  let base = ratio * 75;
  if (preprocessed.userExp >= 5) base += 25;
  else if (preprocessed.userExp >= 3) base += 18;
  else if (preprocessed.userExp >= 1) base += 10;
  else base += 5;

  const jitter = (Math.random() * 3.0) - 1.5;
  return Math.round(Math.min(100, Math.max(10, base + jitter)));
}
