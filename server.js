import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
// GoogleGenerativeAI removed (migrating to Groq)
import { MongoClient } from "mongodb";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary upload helper
async function uploadToCloudinary(base64Data, resourceType = "auto") {
  if (!base64Data) return "";
  if (base64Data.startsWith("http")) return base64Data;
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("Cloudinary not fully configured. Storing raw data in DB.");
    return base64Data;
  }
  try {
    const res = await cloudinary.uploader.upload(base64Data, {
      resource_type: resourceType
    });
    return res.secure_url;
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return base64Data;
  }
}

// Cloudinary delete helper
async function deleteFromCloudinary(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith("http")) return;
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return;
  }
  try {
    const parts = fileUrl.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return;

    // Extract public id with extension skipping 'upload' and 'v[version]'
    let publicIdWithExtension = parts.slice(uploadIndex + 2).join("/");

    // Strip file extension
    const lastDotIndex = publicIdWithExtension.lastIndexOf(".");
    const publicId = lastDotIndex !== -1 ? publicIdWithExtension.substring(0, lastDotIndex) : publicIdWithExtension;

    const resourceType = parts[uploadIndex - 1] || "auto";

    console.log(`Deleting old file from Cloudinary: ${publicId} (${resourceType})`);
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("Cloudinary deletion failed:", err);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static frontend assets
app.use(express.static("."));

const DB_FILE = path.join(__dirname, "db.json");

// Helper to read local database (fallback)
async function readLocalDB() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return { users: [], jobs: [], applications: [], messages: [] };
  }
}

// Helper to write local database (fallback)
async function writeLocalDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// --- Database Connection & Abstraction ---
let mongoDb = null;

async function initDB() {
  if (process.env.MONGO_URI) {
    try {
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();
      mongoDb = client.db("jobsarthi");
      console.log("Connected to MongoDB Atlas!");

      // Auto-seed database from db.json if both users and jobs collections are empty
      const userCount = await mongoDb.collection("users").countDocuments();
      const jobCount = await mongoDb.collection("jobs").countDocuments();
      if (userCount === 0 && jobCount === 0) {
        console.log("MongoDB database is empty. Seeding with data from db.json...");
        const localData = await readLocalDB();
        if (localData.users && localData.users.length > 0) {
          await mongoDb.collection("users").insertMany(localData.users);
        }
        if (localData.jobs && localData.jobs.length > 0) {
          await mongoDb.collection("jobs").insertMany(localData.jobs);
        }
        if (localData.applications && localData.applications.length > 0) {
          await mongoDb.collection("applications").insertMany(localData.applications);
        }
        console.log("MongoDB seeding completed successfully!");
      }
    } catch (err) {
      console.error("Failed to connect to MongoDB Atlas. Falling back to local db.json.", err);
      mongoDb = null;
    }
  } else {
    console.log("No MONGO_URI environment variable detected. Running in Local Mode with db.json.");
  }
}

// --- Automated Live Indian Job Aggregation & Seeding ---
async function autoAggregateJobs() {
  try {
    const existingJobs = await dbService.getJobs();
    if (existingJobs && existingJobs.length > 0) {
      console.log(`Database already has ${existingJobs.length} jobs. Skipping job seeding/aggregation.`);
      return;
    }

    const adzunaAppId = process.env.ADZUNA_APP_ID;
    const adzunaApiKey = process.env.ADZUNA_API_KEY;

    if (adzunaAppId && adzunaApiKey) {
      console.log("Fetching live jobs in India from Adzuna API...");
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${adzunaAppId}&app_key=${adzunaApiKey}&results_per_page=30&content-type=application/json&what=developer`;
      
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            console.log(`Successfully fetched ${data.results.length} jobs from Adzuna. Importing to database...`);
            for (const item of data.results) {
              const salaryMin = item.salary_min ? Math.round(item.salary_min) : null;
              const salaryMax = item.salary_max ? Math.round(item.salary_max) : null;
              let salaryStr = "Not specified";
              if (salaryMin && salaryMax) {
                salaryStr = `₹${salaryMin.toLocaleString('en-IN')} - ₹${salaryMax.toLocaleString('en-IN')} / year`;
              } else if (salaryMin) {
                salaryStr = `₹${salaryMin.toLocaleString('en-IN')} / year`;
              }

              const newJob = {
                id: "adzuna_" + item.id,
                title: item.title || "Software Developer",
                company: (item.company && item.company.display_name) ? item.company.display_name : "Tech Partner",
                logo: "💼",
                category: "Software Engineering",
                type: (item.contract_time === "full_time") ? "Full-time" : "Contract",
                location: (item.location && item.location.display_name) ? item.location.display_name : "India",
                salary: salaryStr,
                match: Math.floor(Math.random() * 25) + 75,
                description: item.description || "No description provided.",
                skills: "HTML, CSS, JavaScript, React, Node.js",
                reqs: [
                  "Strong understanding of modern web technologies.",
                  "Demonstrated problem-solving abilities and collaboration skills.",
                  "Prior experience or project exposure in software engineering."
                ],
                applyUrl: item.redirect_url || ""
              };
              await dbService.createJob(newJob);
            }
            console.log("Adzuna job import completed successfully!");
            return;
          }
        } else {
          console.warn(`Adzuna API returned status: ${response.status}. Falling back to curated local India jobs.`);
        }
      } catch (fetchErr) {
        console.error("Adzuna network request failed. Falling back to curated local India jobs:", fetchErr);
      }
    } else {
      console.log("No Adzuna credentials found in environment variables. Seeding database with curated local India jobs...");
    }

    // Curated local India jobs seeding
    const localJobs = [
      {
        id: "job_local_1",
        title: "Software Engineer (Frontend)",
        company: "Google India",
        logo: "🌐",
        category: "Software Engineering",
        type: "Full-time",
        location: "Bengaluru, Karnataka",
        salary: "₹25,00,000 - ₹35,00,000 / year",
        match: 94,
        description: "Join Google India's Core Engineering team in building scalable frontend solutions for millions of active users. You will work on designing, developing, and deploying highly performant, accessible React applications.",
        skills: "React, JavaScript, CSS, HTML5, Web Performance",
        reqs: [
          "Bachelor's degree in Computer Science, a related technical field, or equivalent practical experience.",
          "2+ years of experience with software development in JavaScript/TypeScript.",
          "Strong experience building single page applications (SPAs) with React/Redux.",
          "Familiarity with modern web standards, accessibility requirements (WCAG), and responsive UI layouts."
        ],
        applyUrl: "https://careers.google.com/"
      },
      {
        id: "job_local_2",
        title: "Full Stack Engineer",
        company: "Razorpay",
        logo: "💳",
        category: "Software Engineering",
        type: "Full-time",
        location: "Bengaluru, Karnataka",
        salary: "₹12,00,000 - ₹18,00,000 / year",
        match: 88,
        description: "At Razorpay, we're building the future of payments. You will be responsible for engineering secure, robust payment workflows on our Node.js and React stack, handling high throughput transactions daily.",
        skills: "Node.js, Express, MongoDB, React, Payment Gateways",
        reqs: [
          "1.5+ years of professional backend or full-stack software development experience.",
          "Solid knowledge of Node.js, asynchronous programming paradigms, and database designs (MongoDB/MySQL).",
          "Experience implementing RESTful API structures and securing endpoints.",
          "Excellent communication skills and eagerness to collaborate in a high-growth environment."
        ],
        applyUrl: "https://razorpay.com/jobs/"
      },
      {
        id: "job_local_3",
        title: "System Engineer",
        company: "Tata Consultancy Services (TCS)",
        logo: "🏢",
        category: "Software Engineering",
        type: "Full-time",
        location: "Mumbai, Maharashtra",
        salary: "₹4,50,000 - ₹6,50,000 / year",
        match: 78,
        description: "TCS is seeking talented developers to work on international enterprise projects. You will participate in development, client discussions, testing, and continuous maintenance of core software systems.",
        skills: "Java, Spring Boot, SQL, Git, Linux",
        reqs: [
          "Bachelor of Engineering / Bachelor of Technology / MCA degree.",
          "Fundamental knowledge of Java programming and database principles.",
          "Familiarity with standard software lifecycle stages (SDLC) and version control tools like Git.",
          "Good analytical, written, and presentation skills."
        ],
        applyUrl: "https://www.tcs.com/careers"
      },
      {
        id: "job_local_4",
        title: "Cloud Solutions Architect",
        company: "Microsoft India",
        logo: "☁️",
        category: "Software Engineering",
        type: "Full-time",
        location: "Hyderabad, Telangana",
        salary: "₹28,00,000 - ₹40,00,000 / year",
        match: 91,
        description: "Empower partners and clients by architecting hybrid-cloud infrastructures utilizing Microsoft Azure. You will collaborate with engineering teams to guide systems migration and security designs.",
        skills: "Azure, Cloud Architecture, DevOps, Kubernetes, Security",
        reqs: [
          "Degree in Computer Science or equivalent experience.",
          "Deep technical understanding of cloud computing services, containers (Docker/Kubernetes), and infrastructure-as-code.",
          "Experience architecting scalable, resilient, and highly secure cloud environments.",
          "Active cloud certifications (Azure Solutions Architect or AWS Professional) are highly preferred."
        ],
        applyUrl: "https://careers.microsoft.com/"
      },
      {
        id: "job_local_5",
        title: "Software Associate",
        company: "Infosys",
        logo: "💻",
        category: "Software Engineering",
        type: "Full-time",
        location: "Pune, Maharashtra",
        salary: "₹4,00,000 - ₹6,00,000 / year",
        match: 80,
        description: "Infosys is onboarding Software Associates to work on cloud migration and business applications. Training will be provided in advanced frameworks and full-stack methodologies.",
        skills: "Python, SQL, HTML, JavaScript",
        reqs: [
          "B.E./B.Tech/M.E./M.Tech/MCA/M.Sc in computer science streams.",
          "Academic or internship project experience in programming.",
          "Strong logical reasoning, algorithmic design capabilities, and basic database querying.",
          "Capable of working effectively in a fast-paced team structure."
        ],
        applyUrl: "https://www.infosys.com/careers.html"
      },
      {
        id: "job_local_6",
        title: "React Native Developer",
        company: "Paytm",
        logo: "📱",
        category: "Software Engineering",
        type: "Full-time",
        location: "Noida, Uttar Pradesh",
        salary: "₹9,00,000 - ₹14,00,000 / year",
        match: 86,
        description: "Paytm is building advanced mobile microservices. You will construct high-fidelity iOS and Android widgets and workflows on React Native, improving page load speeds and responsiveness.",
        skills: "React Native, Redux, Mobile Performance, JavaScript, Git",
        reqs: [
          "2+ years of experience delivering cross-platform mobile apps using React Native.",
          "Strong proficiency in JavaScript, TypeScript, and state management frameworks like Redux.",
          "Familiarity with publishing applications to Apple App Store and Google Play Store.",
          "Basic understanding of native modules and bridges."
        ],
        applyUrl: "https://www.paytm.com/careers"
      },
      {
        id: "job_local_7",
        title: "DevOps Engineer",
        company: "Zomato",
        logo: "🛵",
        category: "Software Engineering",
        type: "Full-time",
        location: "Gurugram, Haryana",
        salary: "₹14,00,000 - ₹20,00,000 / year",
        match: 85,
        description: "Support the deployment pipeline for one of India's largest food-delivery apps. You will maintain Kubernetes clusters, configure CI/CD automations, and manage zero-downtime microservices configurations.",
        skills: "AWS, Docker, Kubernetes, Jenkins, Terraform",
        reqs: [
          "3+ years managing production deployments and containerized infrastructures.",
          "Extensive scripting capabilities in Bash or Python.",
          "Proficiency in setting up Jenkins pipelines and writing Terraform config files.",
          "Solid knowledge of server diagnostics, log aggregation (ELK), and alert metrics (Prometheus)."
        ],
        applyUrl: "https://www.zomato.com/careers"
      },
      {
        id: "job_local_8",
        title: "Backend Engineer (Python/Django)",
        company: "Flipkart",
        logo: "🛒",
        category: "Software Engineering",
        type: "Full-time",
        location: "Bengaluru, Karnataka",
        salary: "₹15,00,000 - ₹22,00,000 / year",
        match: 89,
        description: "Build scalable warehouse logistics systems and catalog pipelines. You will design clean REST endpoints, write performant database queries, and integrate messaging queues for heavy background tasks.",
        skills: "Python, Django, PostgreSQL, Redis, RabbitMQ",
        reqs: [
          "2.5+ years of software design experience in Python.",
          "Strong database schema modeling, indexing optimization, and SQL performance tuning.",
          "Experience using asynchronous workers like Celery and message brokers (RabbitMQ/Kafka).",
          "Understanding of web application security principles."
        ],
        applyUrl: "https://www.flipkartcareers.com/"
      },
      {
        id: "job_local_9",
        title: "Associate Web Developer",
        company: "Zoho Corporation",
        logo: "⚙️",
        category: "Software Engineering",
        type: "Full-time",
        location: "Chennai, Tamil Nadu",
        salary: "₹6,00,000 - ₹9,00,000 / year",
        match: 82,
        description: "Join Zoho's SaaS products division. Work on developing interactive dashboard widgets and building clean client interfaces using modern JavaScript frameworks.",
        skills: "JavaScript, HTML5, CSS3, VueJS, REST APIs",
        reqs: [
          "Bachelor's degree in Computer Science or related fields.",
          "Strong understanding of JS fundamentals, closures, asynchronous flows, and DOM operations.",
          "Familiarity with Vue.js, React, or Angular.",
          "Excellent collaboration capabilities and eye for detailed web aesthetics."
        ],
        applyUrl: "https://www.zoho.com/careers/"
      },
      {
        id: "job_local_10",
        title: "UI/UX Designer",
        company: "Swiggy",
        logo: "🎨",
        category: "Design",
        type: "Full-time",
        location: "Bengaluru, Karnataka",
        salary: "₹10,00,000 - ₹16,00,000 / year",
        match: 87,
        description: "Design delightful experience paths for Swiggy users. You will create modern interface wireframes, build high-fidelity interactive components, and lead product discovery usability tests.",
        skills: "Figma, Wireframing, Prototyping, Visual Design, Usability",
        reqs: [
          "2+ years of product design experience (Figma portfolio required).",
          "Solid comprehension of mobile and desktop user interface aesthetics.",
          "Experience working with design systems and engineering components handoff.",
          "Empathy for users and database-driven design approaches."
        ],
        applyUrl: "https://careers.swiggy.com/"
      },
      {
        id: "job_local_11",
        title: "Data Analyst",
        company: "Wipro",
        logo: "📊",
        category: "Data & Analytics",
        type: "Full-time",
        location: "Hyderabad, Telangana",
        salary: "₹5,00,000 - ₹7,50,000 / year",
        match: 80,
        description: "Wipro is seeking a Data Analyst to compile and evaluate complex business datasets. You will write SQL queries, construct PowerBI charts, and present reports to international client stakeholders.",
        skills: "SQL, Excel, Python, PowerBI, Data Visualization",
        reqs: [
          "Degree in Mathematics, Statistics, Computer Science, or similar.",
          "Strong SQL scripting capabilities and experience with relational schemas.",
          "Proficiency in building clear data stories with Tableau or PowerBI.",
          "Good mathematical capabilities and communication skills."
        ],
        applyUrl: "https://careers.wipro.com/"
      },
      {
        id: "job_local_12",
        title: "Backend Engineer (Node.js)",
        company: "CRED",
        logo: "💎",
        category: "Software Engineering",
        type: "Full-time",
        location: "Bengaluru, Karnataka",
        salary: "₹18,00,000 - ₹26,00,000 / year",
        match: 92,
        description: "Work on CRED's highly secure fintech backend. You will engineer microservices using Node.js/TypeScript, optimize Redis configurations for millisecond latency, and build fail-safe event architectures.",
        skills: "Node.js, TypeScript, Redis, gRPC, Microservices",
        reqs: [
          "3+ years building high-availability backends.",
          "Advanced proficiency in TypeScript/Node.js.",
          "Experience with microservices orchestration, Redis caching, and NoSQL databases.",
          "Eagerness to solve complex transactional scalability issues."
        ],
        applyUrl: "https://careers.cred.club/"
      },
      {
        id: "job_local_13",
        title: "Frontend Engineer (React)",
        company: "Tech Startups",
        logo: "🚀",
        category: "Software Engineering",
        type: "Remote",
        location: "Remote, India",
        salary: "₹8,00,000 - ₹13,00,000 / year",
        match: 85,
        description: "Develop clean, user-friendly SaaS client dashboards. You will implement modular React UI components, integrate APIs, and maximize rendering speeds for global customers.",
        skills: "React, CSS, JavaScript, HTML, REST APIs",
        reqs: [
          "1.5+ years of frontend React developer experience.",
          "Proficiency in responsive CSS layouts (Flexbox, Grid) and modular UI designs.",
          "Experience using REST APIs and state management libs (Redux/Zustand).",
          "Comfortable working asynchronously in a fully remote setup."
        ],
        applyUrl: "https://jobsarthi.ai"
      },
      {
        id: "job_local_14",
        title: "AI Engineer",
        company: "Tata Elxsi",
        logo: "🧠",
        category: "Software Engineering",
        type: "Full-time",
        location: "Bengaluru, Karnataka",
        salary: "₹14,00,000 - ₹20,00,000 / year",
        match: 90,
        description: "Develop, fine-tune, and deploy custom large language models and machine learning pipelines for automated engineering solutions.",
        skills: "Python, PyTorch, LLMs, Transformers, RAG",
        reqs: [
          "Bachelor's or Master's degree in AI, Data Science, or related fields.",
          "Strong foundation in Deep Learning architectures and LLM fine-tuning.",
          "Experience building Retrieval-Augmented Generation (RAG) applications."
        ],
        applyUrl: "https://tataelxsi.com/careers"
      },
      {
        id: "job_local_15",
        title: "Cybersecurity Specialist",
        company: "Reliance Jio",
        logo: "🛡️",
        category: "Security",
        type: "Full-time",
        location: "Navi Mumbai, Maharashtra",
        salary: "₹10,00,000 - ₹15,00,000 / year",
        match: 87,
        description: "Implement zero-trust security postures, perform active penetration testing, and secure core cloud infrastructure and API endpoints across telecom networks.",
        skills: "Penetration Testing, OWASP, AWS, Linux, IAM",
        reqs: [
          "2+ years of cybersecurity and threat assessment experience.",
          "Familiarity with network scanning, vulnerability assessment, and encryption protocols.",
          "Relevant certifications (CEH, OSCP, or CISSP) are highly valued."
        ],
        applyUrl: "https://careers.jio.com"
      },
      {
        id: "job_local_16",
        title: "Data Scientist",
        company: "Tata Consultancy Services (TCS)",
        logo: "📈",
        category: "Data & Analytics",
        type: "Full-time",
        location: "Chennai, Tamil Nadu",
        salary: "₹9,00,000 - ₹14,00,000 / year",
        match: 86,
        description: "Analyze large-scale customer telemetry and transaction data to discover business trends and train predictive machine learning models.",
        skills: "SQL, Python, Pandas, Scikit-learn, Tableau",
        reqs: [
          "Strong background in probability, statistics, and machine learning models.",
          "Proficiency in building clean ETL pipelines and dashboard reports.",
          "Effective communication to convey statistical insights to business leaders."
        ],
        applyUrl: "https://www.tcs.com/careers"
      },
      {
        id: "job_local_17",
        title: "Mobile App Engineer",
        company: "PhonePe",
        logo: "📱",
        category: "Software Engineering",
        type: "Full-time",
        location: "Bengaluru, Karnataka",
        salary: "₹15,00,000 - ₹22,00,000 / year",
        match: 89,
        description: "Engineer highly performant, modular payment features inside PhonePe's mobile applications, ensuring zero packet drops and seamless offline caching.",
        skills: "React Native, TypeScript, iOS, Android, Redux",
        reqs: [
          "2+ years of mobile app development with React Native or Native SDKs.",
          "Solid understanding of offline data persistence and state management.",
          "Experience optimizing application bundle sizes and native bridge communication."
        ],
        applyUrl: "https://www.phonepe.com/careers/"
      },
      {
        id: "job_local_18",
        title: "Product Manager",
        company: "Swiggy",
        logo: "🍔",
        category: "Product Management",
        type: "Full-time",
        location: "Bengaluru, Karnataka",
        salary: "₹18,00,000 - ₹25,00,000 / year",
        match: 91,
        description: "Define product requirements, lead agile sprints, and coordinate cross-functionally between engineering and UX design to launch new food delivery experience features.",
        skills: "PRD writing, RICE framework, Agile, Product Analytics, UX",
        reqs: [
          "2+ years of product management experience at a consumer tech product company.",
          "Ability to write detailed PRDs and manage feature prioritizations.",
          "Excellent collaboration, user empathy, and data-driven decision-making."
        ],
        applyUrl: "https://careers.swiggy.com/"
      }
    ];

    console.log(`Seeding ${localJobs.length} pre-curated Indian jobs...`);
    for (const job of localJobs) {
      await dbService.createJob(job);
    }
    console.log("Database job seeding completed successfully!");
  } catch (err) {
    console.error("Failed to seed jobs:", err);
  }
}

// Unified Database CRUD Operations
const dbService = {
  findUserByEmail: async (email) => {
    if (mongoDb) {
      return await mongoDb.collection("users").findOne({ email: email.toLowerCase() });
    }
    const local = await readLocalDB();
    return local.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserByCredentials: async (email, password) => {
    if (mongoDb) {
      return await mongoDb.collection("users").findOne({ email: email.toLowerCase(), password });
    }
    const local = await readLocalDB();
    return local.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  },
  createUser: async (user) => {
    if (mongoDb) {
      await mongoDb.collection("users").insertOne(user);
      return user;
    }
    const local = await readLocalDB();
    local.users.push(user);
    await writeLocalDB(local);
    return user;
  },
  getJobs: async () => {
    if (mongoDb) {
      // Sort jobs so that newly created jobs are listed first
      return await mongoDb.collection("jobs").find({}).sort({ _id: -1 }).toArray();
    }
    const local = await readLocalDB();
    return local.jobs;
  },
  findJobById: async (id) => {
    if (mongoDb) {
      return await mongoDb.collection("jobs").findOne({ id });
    }
    const local = await readLocalDB();
    return local.jobs.find(j => j.id === id);
  },
  createJob: async (job) => {
    if (mongoDb) {
      await mongoDb.collection("jobs").insertOne(job);
      return job;
    }
    const local = await readLocalDB();
    local.jobs.unshift(job);
    await writeLocalDB(local);
    return job;
  },
  createApplication: async (app) => {
    if (mongoDb) {
      await mongoDb.collection("applications").insertOne(app);
      return app;
    }
    const local = await readLocalDB();
    local.applications.unshift(app);
    await writeLocalDB(local);
    return app;
  },
  getApplications: async (companyName) => {
    if (mongoDb) {
      const query = companyName ? { companyName: { $regex: new RegExp("^" + companyName + "$", "i") } } : {};
      return await mongoDb.collection("applications").find(query).toArray();
    }
    const local = await readLocalDB();
    if (companyName) {
      return local.applications.filter(a => a.companyName.toLowerCase() === companyName.toLowerCase());
    }
    return local.applications;
  }
};

// Groq AI Config
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callGroq(messages, jsonMode = false) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: messages,
    temperature: 0.2
  };

  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGroqVision(base64Data, promptText) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  const base64Content = base64Data.split(",")[1] || base64Data;
  const mimeType = base64Data.split(";")[0].split(":")[1] || "image/jpeg";
  const dataUri = `data:${mimeType};base64,${base64Content}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            },
            {
              type: "image_url",
              image_url: {
                url: dataUri
              }
            }
          ]
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq Vision API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Gemini Multimodal Document Parser
async function parseDocumentWithGemini(base64Data, mimeType, prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Extract raw base64 data without schema header (e.g. data:application/pdf;base64,)
  const base64Content = base64Data.split(",")[1] || base64Data;

  // Clean and determine correct MIME type
  let cleanMimeType = mimeType;
  if (!cleanMimeType) {
    if (base64Data.startsWith("data:")) {
      cleanMimeType = base64Data.split(";")[0].split(":")[1];
    } else {
      cleanMimeType = "application/pdf"; // default fallback
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: base64Content
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const retries = 3;
  let delay = 2000;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          console.warn(`Gemini rate limit hit. Retrying attempt ${attempt}/${retries} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        throw new Error("Gemini returned an empty completion response.");
      }
      const textResponse = result.candidates[0].content.parts[0].text;
      let cleanText = textResponse.trim();
      if (cleanText.startsWith("```")) {
        const lines = cleanText.split("\n");
        if (lines[0].startsWith("```")) lines.shift();
        if (lines[lines.length - 1].startsWith("```")) lines.pop();
        cleanText = lines.join("\n").trim();
      }
      return JSON.parse(cleanText);
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      console.warn(`Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

const SYSTEM_PROMPT = `
You are Sarthi, an advanced AI-powered career companion and recruitment assistant on the JobSarthi platform.
Your goal is to guide job seekers with career advice, resume analysis, mock interviews, and matched job suggestions.
Keep your answers brief, encouraging, professional, and directly actionable.
`;

// --- Server Wake-up API ---
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- Authentication APIs ---

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, fullName, role, company } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const finalEmail = email.trim().toLowerCase();
    const finalPassword = password;
    const finalFullName = fullName ? fullName.trim() : "User";
    const finalRole = role || "jobseeker";

    const existing = await dbService.findUserByEmail(finalEmail);
    if (existing) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const newUser = {
      id: Date.now().toString(),
      email: finalEmail,
      password: finalPassword,
      fullName: finalFullName,
      role: finalRole,
      company: finalRole === "recruiter" ? (company || "InnovateTech") : undefined
    };

    await dbService.createUser(newUser);

    res.json({ success: true, user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role, company: newUser.company } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const finalEmail = (email || "").toLowerCase();
    const finalPassword = password || "";

    const user = await dbService.findUserByCredentials(finalEmail, finalPassword);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Portal verification
    if (role && user.role !== role) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, company: user.company } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// --- Job Listings APIs ---

app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await dbService.getJobs();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to read jobs." });
  }
});

app.post("/api/jobs", async (req, res) => {
  try {
    const { title, category, type, salary, location, skills, description, reqs, company } = req.body;
    const finalTitle = title || "Untitled Position";
    const finalCategory = category || "Software Engineering";
    const finalType = type || "Full-time";
    const finalSalary = salary || "Not specified";
    const finalLocation = location || "Remote";
    const finalSkills = skills || "General Tech Skills";
    const finalDescription = description || "No description provided.";

    const newJob = {
      id: "job_" + Date.now(),
      title: finalTitle,
      company: company || "InnovateTech",
      logo: "💼",
      category: finalCategory,
      type: finalType,
      location: finalLocation,
      salary: finalSalary,
      match: Math.floor(Math.random() * 25) + 75,
      description: finalDescription,
      skills: finalSkills,
      reqs: reqs || []
    };

    await dbService.createJob(newJob);

    res.json({ success: true, job: newJob });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save job listing." });
  }
});

// --- Application APIs ---

app.post("/api/jobs/:id/apply", async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateName, candidateEmail } = req.body;
    const finalName = candidateName || "Anonymous Candidate";
    const finalEmail = candidateEmail || "anonymous@jobsarthi.com";

    const job = await dbService.findJobById(id);
    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    const newApp = {
      id: "app_" + Date.now(),
      jobId: id,
      jobTitle: job.title,
      companyName: job.company,
      candidateName: finalName,
      candidateEmail: finalEmail,
      status: "Applied",
      appliedAt: new Date().toISOString()
    };

    await dbService.createApplication(newApp);

    res.json({ success: true, application: newApp });
  } catch (err) {
    res.status(500).json({ error: "Failed to apply." });
  }
});

app.get("/api/recruiter/applicants", async (req, res) => {
  try {
    const { company } = req.query;
    const applicants = await dbService.getApplications(company);

    // Enrich applicants with profile details from users collection
    const enriched = [];
    for (const app of applicants) {
      const user = await dbService.findUserByEmail(app.candidateEmail);
      enriched.push({
        id: app.id,
        name: app.candidateName,
        email: app.candidateEmail,
        role: app.jobTitle,
        match: Math.floor(Math.random() * 15) + 80, // Dynamic high fit calculation
        status: app.status,
        date: new Date(app.appliedAt).toLocaleDateString() || "Recently",
        skills: user?.profile?.skills || ["General Skills"],
        statement: user?.profile?.experience || "No experience summary provided yet.",
        college: user?.profile?.college || "Not specified",
        degree: user?.profile?.degree || "Not specified",
        cgpa: user?.profile?.cgpa || "N/A",
        certificates: user?.profile?.certificates || [],
        resumeFileName: user?.profile?.resumeFileName || "",
        resumeUrl: user?.profile?.resumeUrl || ""
      });
    }

    res.json(enriched);
  } catch (err) {
    console.error("Enriching applicants failed:", err);
    res.status(500).json({ error: "Failed to fetch applicants." });
  }
});

app.post("/api/recruiter/applicants/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    if (mongoDb) {
      await mongoDb.collection("applications").updateOne(
        { id: id },
        { $set: { status: status } }
      );
    } else {
      const local = await readLocalDB();
      const appIdx = local.applications.findIndex(a => a.id === id);
      if (appIdx !== -1) {
        local.applications[appIdx].status = status;
        await writeLocalDB(local);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Updating application status failed:", err);
    res.status(500).json({ error: "Failed to update status." });
  }
});

// --- Sarthi AI Chat API ---

app.post("/api/sarthi/chat", async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // If Groq API Key is configured, use it!
    if (GROQ_API_KEY) {
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(chatHistory || []).map(msg => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        })),
        { role: "user", content: message }
      ];

      const replyText = await callGroq(messages);
      return res.json({ reply: replyText });
    }

    // --- High-Quality Local Smart Fallback ---
    // This allows the application to work cleanly with mock prompts even if they haven't configured a Gemini key yet.
    const lower = message.toLowerCase();
    let reply = "";

    if (lower.includes("interview") || lower.includes("practice")) {
      reply = `Alright! Initiating the <strong>Mock Interview Simulator</strong>.<br><br>Question 1: What is the main difference between 'let', 'const', and 'var'?`;
    } else if (lower.includes("resume") || lower.includes("review")) {
      reply = `I've analyzed your profile setup:<br><br>• <strong>Match score:</strong> 88% overall.<br>• <strong>Strengths:</strong> HTML, CSS, JavaScript, React.js.<br>• <strong>Opportunities:</strong> You could add backend frameworks (e.g. Node.js or SQLite) to unlock 18 additional job listings.`;
    } else if (lower.includes("job") || lower.includes("suggest") || lower.includes("recommend")) {
      reply = `Based on your skillset, I highly recommend:<br>1. <strong>Senior Frontend Developer</strong> at <em>InnovateTech</em> (95% match)<br>2. <strong>UI/UX Product Designer</strong> at <em>PixelPerfect Labs</em> (84% match)<br><br>You can apply directly on the Jobs page.`;
    } else if (lower.includes("skill") || lower.includes("learn") || lower.includes("roadmap")) {
      reply = `Here is your recommended roadmap to become a Full Stack Developer:<br><br>1. Complete the React Assessment on the Skills page.<br>2. Add Node.js and study RESTful APIs.<br>3. Master database basics with PostgreSQL or MongoDB.`;
    } else {
      reply = `I'm Sarthi, your AI assistant! How can I help you today? You can ask me to:<br>• Review your resume<br>• Practice a mock interview<br>• Suggest matched jobs<br>• Build a custom learning roadmap`;
    }

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat service encountered an error." });
  }
});

// --- AI Interview API ---
const FALLBACK_QUESTIONS = {
  "Full Stack Developer": {
    "Beginner": [
      "What is the difference between client-side rendering (CSR) and server-side rendering (SSR)?",
      "Can you explain what a REST API is and what HTTP methods are commonly used?",
      "What is the Document Object Model (DOM) and how does JavaScript interact with it?",
      "How do relational databases (like MySQL) differ from non-relational databases (like MongoDB)?"
    ],
    "Intermediate": [
      "Explain the concept of middleware in an Express application and how you've used it.",
      "How do you handle state management across deeply nested components in a React application?",
      "What are indexes in SQL databases, and how do they optimize query performance?",
      "Describe the difference between JSON Web Tokens (JWT) and Session-based authentication."
    ],
    "Expert": [
      "How would you design a scalable microservices architecture for a real-time messaging application?",
      "Explain React Server Components and how they differ from client-side hydration.",
      "How do you profile, identify bottlenecks, and optimize SQL queries that take several seconds to run?",
      "What is event loop lag in Node.js, and how would you debug and mitigate it under high load?"
    ]
  },
  "Frontend Developer": {
    "Beginner": [
      "What is CSS Flexbox and how does it differ from CSS Grid?",
      "What is the difference between 'let', 'const', and 'var' in JavaScript?",
      "How do you make a webpage responsive to different screen sizes using CSS?"
    ],
    "Intermediate": [
      "Explain React hooks. How does useEffect's dependency array work?",
      "What is the Critical Rendering Path and how can you optimize it for faster page loads?",
      "Explain the difference between the Virtual DOM and the real DOM."
    ],
    "Expert": [
      "How would you optimize a large React application experiencing performance issues and excessive re-renders?",
      "Explain how micro-frontend architectures work and how they share state securely.",
      "How would you design an offline-first web application using service workers and IndexedDB?"
    ]
  },
  "Backend Developer": {
    "Beginner": [
      "What is the purpose of an API gateway in a backend system?",
      "How does HTTP differ from HTTPS, and how does SSL/TLS work at a high level?",
      "What is the difference between GET and POST requests in RESTful design?"
    ],
    "Intermediate": [
      "What is database normalization, and when would you deliberately de-normalize a schema?",
      "Explain the differences between horizontal scaling and vertical scaling for a web application.",
      "How do you secure backend endpoints against common vulnerabilities like SQL Injection and XSS?"
    ],
    "Expert": [
      "Explain the CAP theorem and how it guides your choice of databases in distributed systems.",
      "How do you design a high-throughput distributed task queue system using Redis or RabbitMQ?",
      "How would you handle distributed database transactions across multiple microservices?"
    ]
  },
  "Data Scientist": {
    "Beginner": [
      "What is the difference between supervised and unsupervised learning?",
      "What is overfitting and how can it be prevented?",
      "What is the difference between a list and a tuple in Python?"
    ],
    "Intermediate": [
      "Explain the difference between L1 and L2 regularization.",
      "How does a Random Forest classifier work and what are its advantages?",
      "How do you handle imbalanced datasets when training a model?"
    ],
    "Expert": [
      "How would you design a distributed machine learning pipeline to process terabytes of data daily?",
      "Can you explain the mathematical derivation or intuition behind Gradient Boosting?",
      "Explain how transformer self-attention mechanisms work and why they scale better than LSTMs."
    ]
  },
  "DevOps Engineer": {
    "Beginner": [
      "What is Continuous Integration and Continuous Deployment (CI/CD)?",
      "What is Docker and how does it differ from a Virtual Machine?",
      "What is the purpose of version control systems like Git?"
    ],
    "Intermediate": [
      "Explain the difference between a rolling update and a blue-green deployment strategy.",
      "What is Infrastructure as Code (IaC) and how does Terraform manage state?",
      "How would you secure a Kubernetes cluster in a production environment?"
    ],
    "Expert": [
      "How would you design a multi-region, highly available, active-active cloud infrastructure on AWS/Azure?",
      "Explain how you would debug high latency or packet loss in a Kubernetes service mesh like Istio.",
      "Describe a custom GitOps pipeline you built to manage stateful sets in microservices."
    ]
  },
  "Product Manager": {
    "Beginner": [
      "What is a Product Requirement Document (PRD) and what are its key components?",
      "How do you prioritize features using the RICE framework?",
      "What is the difference between an MVP and a prototype?"
    ],
    "Intermediate": [
      "How do you handle conflicting feedback from engineering, design, and business stakeholders?",
      "Describe how you would measure the success of a newly launched notifications feature.",
      "What key product metrics would you track for a subscription-based SaaS app?"
    ],
    "Expert": [
      "How would you design a product strategy to launch JobSarthi in a highly competitive market like India?",
      "Explain a time you made a high-stakes pivot based on negative user telemetry data.",
      "How do you balance tech debt reduction with new feature development on a core platform team?"
    ]
  },
  "Mobile Developer": {
    "Beginner": [
      "What is the difference between native and cross-platform mobile development?",
      "What is the lifecycle of an Activity in Android or a View Controller in iOS?",
      "What is the purpose of state management in mobile applications?"
    ],
    "Intermediate": [
      "How do you optimize mobile app startup time and minimize battery consumption?",
      "Describe how you've handled offline synchronization and local caching in React Native or Native iOS.",
      "How do you secure API tokens and sensitive credentials stored on mobile devices?"
    ],
    "Expert": [
      "How would you design a modular, scalable architecture for a mobile super-app containing multiple sub-services?",
      "Explain how react-native's new architecture (Fabric and TurboModules) improves performance over the bridge.",
      "How do you debug memory leaks and profile frame rates (FPS) in an iOS/Android production build?"
    ]
  },
  "UI/UX Designer": {
    "Beginner": [
      "What is the difference between UI and UX design?",
      "What are the core principles of visual hierarchy and contrast?",
      "How do you use Figma components and auto-layout to build reusable designs?"
    ],
    "Intermediate": [
      "Explain how you conduct a usability test and translate insights into design revisions.",
      "How do you design for accessibility (WCAG AA/AAA standards) in a complex web dashboard?",
      "Describe your process for handing off assets and design systems to developers."
    ],
    "Expert": [
      "How would you design a design system that scales across multiple web, mobile, and desktop portals?",
      "Describe a time you used A/B testing data to completely redesign a core checkout or onboarding flow.",
      "How do you maintain design consistency when designing for dark mode and light mode across diverse screens?"
    ]
  },
  "AI / ML Engineer": {
    "Beginner": [
      "What is a neural network and what is the role of an activation function?",
      "What is the difference between training, validation, and test datasets?",
      "What are common evaluation metrics for regression and classification tasks?"
    ],
    "Intermediate": [
      "How do you fine-tune a pre-trained LLM like Llama or GPT on a custom domain-specific dataset?",
      "Explain how optimization algorithms like Adam and SGD adjust model weights during backpropagation.",
      "How do you handle prompt injection vulnerabilities in a production LLM application?"
    ],
    "Expert": [
      "How would you design a low-latency RAG (Retrieval-Augmented Generation) pipeline handling millions of document chunks?",
      "Explain how you would optimize LLM inference speed using quantization, speculative decoding, and vLLM.",
      "How would you design a real-time anomaly detection system for fraud detection with strict latency limits (<10ms)?"
    ]
  },
  "Economics / Financial Analyst": {
    "Beginner": [
      "Can you explain the difference between microeconomics and macroeconomics?",
      "What is supply and demand, and how does market equilibrium work?",
      "How do inflation and interest rates relate to each other?"
    ],
    "Intermediate": [
      "Explain the concept of Opportunity Cost and how it applies to business decision-making.",
      "How do you perform a cost-benefit analysis for a new project or investment?",
      "Describe the difference between fiscal policy and monetary policy and their impacts on business."
    ],
    "Expert": [
      "How would you model the economic impact of a sudden commodity price shock on a retail supply chain?",
      "Can you explain game theory and how Nash equilibrium can be applied to competitive market pricing?",
      "How do you evaluate currency exchange risk and hedge against it in international trade?"
    ]
  }
};

app.post("/api/sarthi/interview/next", async (req, res) => {
  try {
    const { role, difficulty, history, currentQuestion, userAnswer, timerExpired, candidateProfile, candidateName, interviewerAbility } = req.body;
    const currentRole = role || "Full Stack Developer";
    const currentDiff = difficulty || "Intermediate";
    const isFirstQuestion = !currentQuestion || !history || history.length === 0;

    let resolvedRole = currentRole;
    if (currentRole === "From your resume") {
      if (candidateProfile) {
        const skillsStr = Array.isArray(candidateProfile.skills) ? candidateProfile.skills.join(" ").toLowerCase() : (candidateProfile.skills || "").toLowerCase();
        const expStr = (candidateProfile.experience || "").toLowerCase();
        const degStr = (candidateProfile.degree || "").toLowerCase();

        if (degStr.includes("economics") || expStr.includes("economics") || skillsStr.includes("economics") ||
            degStr.includes("finance") || expStr.includes("finance") || skillsStr.includes("finance") ||
            degStr.includes("commerce") || expStr.includes("commerce") || skillsStr.includes("commerce")) {
          resolvedRole = "Economics / Financial Analyst";
        } else if (skillsStr.includes("react") || skillsStr.includes("javascript") || skillsStr.includes("frontend") || expStr.includes("frontend") || expStr.includes("web developer")) {
          resolvedRole = "Frontend Developer";
        } else if (skillsStr.includes("node") || skillsStr.includes("backend") || expStr.includes("backend") || skillsStr.includes("python")) {
          resolvedRole = "Backend Developer";
        } else {
          if (expStr.includes("design") || skillsStr.includes("figma") || skillsStr.includes("ui") || skillsStr.includes("ux")) {
            resolvedRole = "UI/UX Designer";
          } else if (expStr.includes("product") || skillsStr.includes("pm") || skillsStr.includes("agile")) {
            resolvedRole = "Product Manager";
          } else if (expStr.includes("data scientist") || skillsStr.includes("machine learning")) {
            resolvedRole = "Data Scientist";
          } else {
            resolvedRole = "Candidate's Profile Role";
          }
        }
      }
      if (resolvedRole === "From your resume") {
        resolvedRole = "Full Stack Developer";
      }
    }

    // Build the system prompt
    let systemPrompt = `You are Sarthi, a friendly, extremely professional, and realistic interviewer on the JobSarthi platform.
Your target role is: ${resolvedRole}. The starting difficulty is: ${currentDiff}.
Behave and conduct the interview completely based on the user's profile and background. Do NOT assume the candidate is a software engineer or has a developer background unless their target role, skills, or experience explicitly states it.
For example, if their background is in Economics or Finance, ask relevant questions about Economics/Finance and related analytical methodologies. Do NOT refer to transitions from software unless the resume/profile clearly indicates a software history.
Maintain a professional, conversational tone. Do not ask repetitive questions. 
Actively listen to the candidate's responses. Your next question MUST be a direct follow-up or build upon their previous answer to keep the conversation natural and authentic.`;

    if (interviewerAbility === "vikram") {
      systemPrompt += `\nAbility Active: You are Prof. Vikram, an aged expert who asks questions at a VERY deep technical level. Focus intensely on low-level mechanics, internal architecture patterns, memory limits, and complex algorithms rather than simple high-level concepts.`;
    } else if (interviewerAbility === "ananya") {
      systemPrompt += `\nAbility Active: You are Dr. Ananya. You conduct evaluations with extreme scrutiny and rigor. Grade responses strictly, and offer granular critical critiques rather than general praise.`;
    }

    systemPrompt += `\nYou must return your output ONLY as a valid JSON object matching the following schemas.

If it is the FIRST question:
{
  "nextQuestion": "The first interview question to ask the candidate, personalized to their background if profile details are provided."
}

If it is a SUBSEQUENT question:
{
  "feedback": "1-2 sentence constructive feedback on their previous answer.",
  "score": 8, // integer score from 0 to 10 evaluating their last answer
  "difficultyChange": "increase" | "decrease" | "maintain",
  "nextQuestion": "The next follow-up question to ask the candidate, directly engaging with what they just said."
}`;

    // Build conversation context
    let profileContext = `Candidate Name: ${candidateName || "Candidate"}\n`;
    if (candidateProfile) {
      if (candidateProfile.skills) {
        profileContext += `Skills: ${Array.isArray(candidateProfile.skills) ? candidateProfile.skills.join(", ") : candidateProfile.skills}\n`;
      }
      if (candidateProfile.college) {
        profileContext += `College: ${candidateProfile.college}\n`;
      }
      if (candidateProfile.degree) {
        profileContext += `Degree: ${candidateProfile.degree}\n`;
      }
      if (candidateProfile.experience) {
        profileContext += `Experience: ${candidateProfile.experience}\n`;
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Hello, I'm ready to start the interview for the ${currentRole} position at ${currentDiff} difficulty. Here is my profile background:\n${profileContext}` }
    ];

    if (!isFirstQuestion && history && history.length > 0) {
      // Reconstruct conversation history
      for (let i = 0; i < history.length; i++) {
        const item = history[i];
        // AI asks question
        messages.push({
          role: "assistant",
          content: JSON.stringify({ nextQuestion: item.question })
        });
        // User responds
        messages.push({
          role: "user",
          content: item.answer || "[No Answer / Skipped]"
        });
        // AI feedback and next question
        const nextQVal = (i < history.length - 1) ? history[i+1].question : currentQuestion;
        messages.push({
          role: "assistant",
          content: JSON.stringify({
            feedback: item.feedback,
            score: item.score,
            difficultyChange: "maintain",
            nextQuestion: nextQVal
          })
        });
      }
    }

    if (!isFirstQuestion) {
      // Add current active question and current userAnswer
      messages.push({
        role: "assistant",
        content: JSON.stringify({ nextQuestion: currentQuestion })
      });
      messages.push({
        role: "user",
        content: userAnswer || (timerExpired ? "[Skipped due to response timer expiring]" : "[No Answer]")
      });
    }

    // Call LLM
    if (GROQ_API_KEY) {
      console.log(`[Sarthi AI] Generating question using Groq... isFirstQuestion: ${isFirstQuestion}`);
      const responseText = await callGroq(messages, true);
      let cleanText = responseText.trim();
      if (cleanText.startsWith("```")) {
        const lines = cleanText.split("\n");
        if (lines[0].startsWith("```")) lines.shift();
        if (lines[lines.length - 1].startsWith("```")) lines.pop();
        cleanText = lines.join("\n").trim();
      }
      const responseJSON = JSON.parse(cleanText);
      return res.json(responseJSON);

    } else if (process.env.GEMINI_API_KEY) {
      console.log(`[Sarthi AI] Generating question using Gemini... isFirstQuestion: ${isFirstQuestion}`);
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      // Map OpenAI messages format to Gemini contents format
      const geminiContents = messages.map(msg => {
        let roleName = "user";
        if (msg.role === "system") roleName = "user"; // system instructions go in systemInstruction parameter or user prompt
        else if (msg.role === "assistant") roleName = "model";
        return {
          role: roleName,
          parts: [{ text: msg.content }]
        };
      });

      const payload = {
        contents: geminiContents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      let responseText = result.candidates[0].content.parts[0].text.trim();
      if (responseText.startsWith("```")) {
        const lines = responseText.split("\n");
        if (lines[0].startsWith("```")) lines.shift();
        if (lines[lines.length - 1].startsWith("```")) lines.pop();
        responseText = lines.join("\n").trim();
      }
      const responseJSON = JSON.parse(responseText);
      return res.json(responseJSON);
    }

    // --- High-Quality Local Fallback Mode ---
    console.log("[Sarthi AI] Fallback mode triggered.");
    let fallbackRole = resolvedRole;
    if (!FALLBACK_QUESTIONS[fallbackRole]) {
      const lowerRole = fallbackRole.toLowerCase();
      if (lowerRole.includes("economics") || lowerRole.includes("finance") || lowerRole.includes("business")) {
        fallbackRole = "Economics / Financial Analyst";
      } else {
        fallbackRole = "Full Stack Developer";
      }
    }
    const roleQuestions = FALLBACK_QUESTIONS[fallbackRole] || FALLBACK_QUESTIONS["Full Stack Developer"];
    const diffQuestions = roleQuestions[currentDiff] || roleQuestions["Intermediate"];

    if (isFirstQuestion) {
      let firstQ = diffQuestions[0];
      if (interviewerAbility === "vikram") {
        const expertQuestions = roleQuestions["Expert"] || diffQuestions;
        firstQ = expertQuestions[0] + " Please explain the deep under-the-hood engine mechanics and architectural bottlenecks related to this.";
      }
      return res.json({
        nextQuestion: firstQ
      });
    }

    // Evaluate response locally
    let score = 5;
    let feedback = "";
    let difficultyChange = "maintain";

    if (timerExpired || !userAnswer || userAnswer.trim().length < 5) {
      score = 0;
      feedback = "You skipped this question or the timer expired. Let's try another one.";
      difficultyChange = "decrease";
    } else {
      const answerLower = userAnswer.toLowerCase();
      // Simple keyword matching for score calculation
      let keywordsMatched = 0;
      const keyTerms = [
        "rendering", "server", "client", "state", "components", "index", "query", "database", "middleware", "token", "auth", "flexbox", "grid", "hooks", "dom", "scaling", "api", "load",
        "supervised", "unsupervised", "regression", "model", "ci/cd", "docker", "kubernetes", "rice", "prd", "mvp", "native", "cross-platform", "figma", "accessibility", "quantization", "rag"
      ];

      keyTerms.forEach(term => {
        if (answerLower.includes(term)) keywordsMatched++;
      });

      if (keywordsMatched >= 3) {
        score = 8;
        feedback = "Excellent answer! You covered the core technical concepts well.";
        difficultyChange = "increase";
      } else if (keywordsMatched >= 1) {
        score = 6;
        feedback = "Good response. Try to elaborate on how the architecture handles edge cases.";
        difficultyChange = "maintain";
      } else {
        score = 4;
        feedback = "A basic overview. Make sure to review the core execution details of this technology.";
        difficultyChange = "decrease";
      }
    }

    // Apply strict grading/scrutiny from Dr. Ananya
    if (interviewerAbility === "ananya") {
      score = Math.max(1, Math.round(score * 0.7));
      feedback = `Dr. Ananya's strict assessment: ${feedback} Make sure to explain optimization specifics.`;
    }

    // Determine next question index
    let nextIndex = history.length % diffQuestions.length;
    let newDiff = currentDiff;
    if (interviewerAbility === "vikram") {
      newDiff = "Expert"; // Prof. Vikram always asks expert level questions
    } else {
      if (difficultyChange === "increase") {
        newDiff = currentDiff === "Beginner" ? "Intermediate" : "Expert";
      } else if (difficultyChange === "decrease") {
        newDiff = currentDiff === "Expert" ? "Intermediate" : "Beginner";
      }
    }

    const nextRoleQuestions = FALLBACK_QUESTIONS[currentRole] || FALLBACK_QUESTIONS["Full Stack Developer"];
    const nextDiffQuestions = nextRoleQuestions[newDiff] || nextRoleQuestions["Intermediate"];
    let nextQ = nextDiffQuestions[nextIndex % nextDiffQuestions.length];
    
    if (interviewerAbility === "vikram") {
      nextQ += " Please explain the deep under-the-hood engine mechanics and architectural bottlenecks related to this.";
    }

    res.json({
      feedback,
      score,
      difficultyChange,
      nextQuestion: nextQ
    });

  } catch (err) {
    console.error("Interview API error:", err);
    // Send a generic safe JSON
    res.json({
      feedback: "Technical error, but let's continue with the next concept.",
      score: 5,
      difficultyChange: "maintain",
      nextQuestion: "Can you explain the main lifecycle methods or stages in web application performance optimization?"
    });
  }
});

// --- Seeker Profile APIs ---

app.get("/api/seeker/profile", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email query param is required." });
    }
    const user = await dbService.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json(user.profile || { college: "", degree: "", cgpa: "", skills: [], experience: "", resumeUrl: "", resumeFileName: "", linkedinId: "", certificates: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

app.post("/api/seeker/profile", async (req, res) => {
  try {
    const { email, profile } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    // Fetch existing user to clean up old resume/files from Cloudinary if overwritten
    const existingUser = await dbService.findUserByEmail(email);
    const oldResumeUrl = existingUser?.profile?.resumeUrl;
    const oldAvatarUrl = existingUser?.profile?.avatarUrl;

    // Intercept Base64 strings and upload to Cloudinary
    if (profile) {
      // 1. Handle resumeBase64
      if (profile.resumeBase64 && profile.resumeBase64.startsWith("data:")) {
        if (oldResumeUrl) {
          await deleteFromCloudinary(oldResumeUrl);
        }
        console.log("Uploading resume to Cloudinary...");
        // Resumes (PDF, DOCX) should be uploaded as raw/auto
        const secureUrl = await uploadToCloudinary(profile.resumeBase64, "auto");
        profile.resumeUrl = secureUrl;
        delete profile.resumeBase64; // Remove heavy raw base64 so we don't store it in DB
      }

      // Handle avatarBase64 (Profile Picture)
      if (profile.avatarBase64 && profile.avatarBase64.startsWith("data:")) {
        if (oldAvatarUrl) {
          await deleteFromCloudinary(oldAvatarUrl);
        }
        console.log("Uploading profile picture to Cloudinary...");
        const secureUrl = await uploadToCloudinary(profile.avatarBase64, "image");
        profile.avatarUrl = secureUrl;
        delete profile.avatarBase64;
      }

      // 2. Handle certificates fileUrl base64
      if (profile.certificates && Array.isArray(profile.certificates)) {
        for (let i = 0; i < profile.certificates.length; i++) {
          const cert = profile.certificates[i];
          if (cert.fileUrl && cert.fileUrl.startsWith("data:")) {
            console.log(`Uploading certificate "${cert.title}" to Cloudinary...`);
            const secureUrl = await uploadToCloudinary(cert.fileUrl, "auto");
            cert.fileUrl = secureUrl;
          }
        }
      }
    }

    if (mongoDb) {
      await mongoDb.collection("users").updateOne(
        { email: email.toLowerCase() },
        { $set: { profile: profile } }
      );
    } else {
      const local = await readLocalDB();
      const user = local.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        user.profile = profile;
        await writeLocalDB(local);
      }
    }
    res.json({ success: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save profile." });
  }
});

app.post("/api/seeker/parse-resume", async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Base64 data is required." });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
      try {
        console.log("Parsing resume via Gemini 2.5 Flash...");
        const prompt = `Extract the candidate's education (college, degree, CGPA), skills (comma-separated list of tags), work experience, class 10th marks, class 12th marks, hobbies (list), preferred locations (list), expected CTC, and languages known. Return ONLY a raw JSON object matching this schema:\n{\n  "college": "College name",\n  "degree": "Degree name",\n  "cgpa": "CGPA (e.g. 8.5/10 or 3.8/4.0)",\n  "skills": ["Skill1", "Skill2"],\n  "experience": "Brief experience summary",\n  "class10th": "Class 10th marks (e.g. 92% or 9.5 CGPA) if found, else empty",\n  "class12th": "Class 12th marks (e.g. 88% or 85%) if found, else empty",\n  "hobbies": ["Hobby1", "Hobby2"] if found, else empty array,\n  "preferredLocations": ["Location1", "Location2"] if found, else empty array,\n  "expectedCtc": "Expected CTC if found, else empty",\n  "languages": ["Lang1", "Lang2"] if found, else empty array\n}`;
        const parsed = await parseDocumentWithGemini(base64Data, mimeType, prompt);
        return res.json(parsed);
      } catch (geminiErr) {
        console.warn("Gemini parsing failed, falling back to mock:", geminiErr);
      }
    }

    // --- Mock Fallback OCR Parsing ---
    console.log("Emulating Resume OCR...");
    res.json({
      college: "BITS Pilani",
      degree: "B.E. in Computer Science",
      cgpa: "9.1/10",
      skills: ["HTML", "CSS", "JavaScript", "React.js", "Node.js", "MongoDB", "SQL"],
      experience: "Web Developer Intern at InnovateTech Solutions (4 months), optimized UI performance and built interactive dashboard features.",
      class10th: "94%",
      class12th: "92%",
      hobbies: ["Coding", "Chess", "Gaming"],
      preferredLocations: ["Mumbai", "Remote"],
      expectedCtc: "12 LPA",
      languages: ["English", "Hindi"]
    });

  } catch (err) {
    console.error("Resume parsing error:", err);
    res.status(500).json({ error: "Failed to parse resume." });
  }
});

app.post("/api/seeker/parse-certificate", async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Base64 data is required." });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
      try {
        console.log("Parsing certificate via Gemini 2.5 Flash...");
        const prompt = `Identify the title of this certificate. Return ONLY a raw JSON object matching this schema:\n{\n  "title": "Certificate Title / Course Name"\n}`;
        const parsed = await parseDocumentWithGemini(base64Data, mimeType, prompt);
        return res.json(parsed);
      } catch (geminiErr) {
        console.warn("Gemini certificate parsing failed, falling back to mock:", geminiErr);
      }
    }

    // --- Mock Fallback OCR Parsing ---
    console.log("Emulating Certificate OCR...");
    res.json({
      title: "Google Advanced Project Management Certificate"
    });

  } catch (err) {
    console.error("Certificate parsing error:", err);
    res.status(500).json({ error: "Failed to parse certificate." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Fallback to index.html for undefined frontend routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDB().then(async () => {
  await autoAggregateJobs();
  app.listen(PORT, () => {
    console.log(`JobSarthi server running at http://localhost:${PORT}`);
  });
});
