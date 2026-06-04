import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");
const SAMPLE_JOBS_DIR = path.join(__dirname, "database", "sample_jobs");
const SAMPLE_JOBS_FILE = path.join(SAMPLE_JOBS_DIR, "jobs.json");

// 1. List of 350 Real-sounding companies
const COMPANIES = [
  "Tata Consultancy Services (TCS)", "Infosys", "Wipro", "HCL Technologies", "Cognizant",
  "Tech Mahindra", "L&T Technology Services", "Mindtree", "Google India", "Microsoft India",
  "Amazon India", "Meta India", "Apple India", "Adobe India", "Salesforce India",
  "Oracle India", "Cisco India", "Intel India", "IBM India", "SAP Labs India",
  "Accenture", "Capgemini", "Deloitte", "PwC", "EY", "KPMG", "McKinsey & Company",
  "Boston Consulting Group (BCG)", "Bain & Company", "J.P. Morgan", "Goldman Sachs",
  "Morgan Stanley", "HSBC", "Citibank", "Standard Chartered", "Walmart Global Tech",
  "Target Corporation", "Tesco", "Shell India", "BP India", "Chevron", "Reliance Industries",
  "Reliance Jio", "Airtel", "Vodafone Idea (Vi)", "Tata Motors", "Mahindra & Mahindra",
  "Larsen & Toubro", "ITC Limited", "Adani Group", "Aditya Birla Group", "Godrej Group",
  "Bajaj Auto", "Hero MotoCorp", "Maruti Suzuki", "Paytm", "PhonePe", "CRED",
  "Swiggy", "Zomato", "Ola Cabs", "Uber India", "Flipkart", "Meesho", "Nykaa",
  "Zepto", "Blinkit", "Razorpay", "Pine Labs", "Groww", "Zerodha", "Upstox",
  "Delhivery", "InMobi", "ShareChat", "PolicyBazaar", "Urban Company", "Oyo Rooms",
  "PhysicsWallah", "Unacademy", "Cars24", "Spinny", "BigBasket", "HDFC Bank",
  "ICICI Bank", "State Bank of India (SBI)", "Kotak Mahindra Bank", "Axis Bank",
  "IDFC First Bank", "BharatPe", "OneCard", "Slice", "Persistent Systems", "LTIMindtree",
  "Coforge", "Mphasis", "Cyient", "KPIT Technologies", "Zensar Technologies",
  "Intellect Design Arena", "Firstsource", "eClerx", "Genpact", "WNS Global Services",
  "EXL Service", "Teleperformance", "Sutherland", "Conduent", "Cognizant Technology Solutions",
  "Syntel", "Virtusa", "UST Global", "Hexaware Technologies", "Sonata Software",
  "Birlasoft", "Intellect Design", "Tata Elxsi", "Rolta India", "3i Infotech",
  "TCS iON", "Quess Corp", "TeamLease", "Adecco India", "ManpowerGroup India",
  "Randstad India", "Michael Page India", "Korn Ferry India", "Spencer Stuart",
  "Stanton Chase", "Boyden India", "Amrop India", "Egon Zehnder", "Heidrick & Struggles",
  "Mercer India", "Willis Towers Watson", "Aon India", "Hay Group", "Mercer",
  "JLL India", "CBRE India", "Knight Frank India", "Colliers India", "Cushman & Wakefield",
  "Sotheby's Realty", "DLF Limited", "Godrej Properties", "Tata Housing", "Sobha Limited",
  "Prestige Group", "Brigade Group", "Puravankara", "Lodha Group", "Oberoi Realty",
  "Unitech", "Ansal API", "Omaxe", "Supertech", "Amrapali", "Jaypee Group",
  "L&T Realty", "Mahindra Lifespaces", "Shapoorji Pallonji", "Hiranandani Group",
  "K Raheja Corp", "Phoenix Mills", "Rustomjee", "Kalpataru Group", "Indiabulls Real Estate",
  "Tata Power", "Adani Power", "Jindal Steel & Power", "JSW Steel", "Tata Steel",
  "Steel Authority of India (SAIL)", "National Mineral Development Corporation (NMDC)",
  "Coal India", "ONGC", "Indian Oil Corporation (IOCL)", "Bharat Petroleum (BPCL)",
  "Hindustan Petroleum (HPCL)", "GAIL", "NTPC", "Power Grid Corporation", "NHPC",
  "SJVN", "Damodar Valley Corporation (DVC)", "Tata Chemicals", "UPL Limited",
  "Pidilite Industries", "Asian Paints", "Berger Paints", "Kansai Nerolac", "AkzoNobel",
  "Sun Pharmaceutical", "Dr. Reddy's Laboratories", "Cipla", "Lupin Limited",
  "Aurobindo Pharma", "Zydus Lifesciences", "Torrent Pharmaceuticals", "Biocon",
  "Glenmark Pharmaceuticals", "Alkem Laboratories", "Ipca Laboratories", "Abbott India",
  "GlaxoSmithKline Pharmaceuticals (GSK)", "Pfizer India", "Sanofi India", "Novartis India",
  "Roche India", "Bayer India", "Monsanto India", "Syngene International",
  "Jubilant Pharmova", "Divi's Laboratories", "Laurus Labs", "Granules India",
  "Hindustan Unilever (HUL)", "ITC", "Nestle India", "Britannia Industries",
  "Dabur India", "Marico", "Godrej Consumer Products (GCPL)", "Colgate-Palmolive India",
  "Procter & Gamble (P&G) India", "L'Oreal India", "Nivea India", "Johnson & Johnson India",
  "Emami", "Jyothy Labs", "Tata Consumer Products", "Amul", "Mother Dairy",
  "Hatsun Agro Product", "Heritage Foods", "Parle Agro", "Coca-Cola India", "PepsiCo India",
  "Mondelez India", "Ferrero India", "Nestle", "Adani Wilmar", "Ruchi Soya",
  "Cargill India", "Bunge India", "Glencore India", "Louis Dreyfus Company India",
  "Olam International India", "Wilmar International India", "Archer Daniels Midland (ADM)",
  "Maruti Suzuki India", "Hyundai Motor India", "Tata Motors", "Mahindra & Mahindra",
  "Honda Cars India", "Toyota Kirloskar Motor", "Ford India", "General Motors India",
  "Volkswagen India", "Skoda Auto India", "Renault India", "Nissan Motor India",
  "Kia India", "MG Motor India", "Fiat India", "Force Motors", "Ashok Leyland",
  "Eicher Motors", "Swaraj Engines", "Sonalika Tractors", "Escorts Kubota",
  "John Deere India", "New Holland Agriculture India", "Mahindra Tractors",
  "Bajaj Auto", "Hero MotoCorp", "TV S Motor Company", "Royal Enfield", "Honda Motorcycle & Scooter India",
  "Suzuki Motorcycle India", "Yamaha Motor India", "Piaggio Vehicles", "Kawasaki India",
  "Harley-Davidson India", "Triumph Motorcycles India", "Ducati India", "Benelli India",
  "Jawa Motorcycles", "Yezdi Motorcycles", "Ather Energy", "Ola Electric",
  "Tork Motors", "Revolt Motors", "Hero Electric", "Okinawa Autotech",
  "Ampere Vehicles", "LML Electric", "Simple Energy", "Bounce Infinity",
  "HDFC Bank", "ICICI Bank", "State Bank of India (SBI)", "Kotak Mahindra Bank",
  "Axis Bank", "IDFC First Bank", "IndusInd Bank", "Yes Bank", "Federal Bank",
  "South Indian Bank", "Karnataka Bank", "Karur Vysya Bank", "City Union Bank",
  "RBL Bank", "Bandhan Bank", "IDBI Bank", "Canara Bank", "Bank of Baroda (BoB)",
  "Punjab National Bank (PNB)", "Union Bank of India", "Indian Bank", "Bank of India",
  "Central Bank of India", "UCO Bank", "Bank of Maharashtra", "Punjab & Sind Bank",
  "India Post Payments Bank (IPPB)", "Paytm Payments Bank", "Airtel Payments Bank",
  "Fino Payments Bank", "Jio Payments Bank", "NSDL Payments Bank"
];

// Deduplicate companies and slice to ~350
const companiesList = [...new Set(COMPANIES)].slice(0, 360);

// Helper to slugify company names
function getCompanySlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 15);
}

// 2. Data Categories & Titles for Naukri-like Experience
const CATEGORIES_DATA = {
  "Software Engineering": {
    titles: [
      "Frontend Developer", "Backend Developer", "Full Stack Engineer", "Java Software Engineer",
      "Python Developer", "React Native Developer", "Node.js Developer", "DevOps Engineer",
      "Cloud Architect", "System Engineer", "QA Automation Engineer", "iOS Developer",
      "Android Developer", "C++ Developer", "Golang Engineer", "PHP Developer",
      "ASP.NET Developer", "Embedded Systems Engineer", "Site Reliability Engineer (SRE)"
    ],
    skills: [
      "React, JavaScript, HTML, CSS, Git", "Node.js, Express, MongoDB, REST APIs",
      "Java, Spring Boot, Microservices, SQL", "Python, Django, PostgreSQL, Redis",
      "AWS, Docker, Kubernetes, Jenkins, Terraform", "React Native, Redux, iOS, Android",
      "TypeScript, Node.js, PostgreSQL, Docker", "C++, Linux, Multithreading, Data Structures",
      "Go, Kubernetes, gRPC, Microservices", "PHP, Laravel, MySQL, JavaScript",
      "C#, ASP.NET MVC, SQL Server, Azure", "Selenium, Java, Cucumber, Jenkins",
      "Swift, iOS SDK, Xcode, UIKit", "Kotlin, Android SDK, Jetpack Compose",
      "Python, Flask, MongoDB, AWS", "JavaScript, Vue.js, CSS, HTML5"
    ],
    reqs: [
      "Bachelor's degree in Computer Science, IT, or equivalent engineering fields.",
      "Hands-on programming experience and strong problem-solving capabilities.",
      "Understanding of software development life cycles (SDLC) and Agile principles.",
      "Experience with relational or non-relational database query optimization.",
      "Strong communication and collaborative development using version control (Git)."
    ]
  },
  "Data & Analytics": {
    titles: [
      "Data Scientist", "Data Analyst", "Machine Learning Engineer", "Data Engineer",
      "Business Intelligence Analyst", "Big Data Developer", "AI Engineer", "AI/ML Scientist",
      "Database Administrator (DBA)", "Data Governance Specialist"
    ],
    skills: [
      "SQL, Python, Pandas, Scikit-learn, Tableau", "Python, PyTorch, TensorFlow, LLMs, NLP",
      "SQL, PowerBI, Excel, Data Visualization", "Python, Spark, Hadoop, SQL, ETL Pipelines",
      "Tableau, SQL, Data Warehouse, ETL", "Scala, Spark, Hive, AWS, Redshift",
      "SQL, Oracle Database, Performance Tuning, Backup & Recovery", "Python, R, SQL, Statistics, Data Modeling"
    ],
    reqs: [
      "Degree in Statistics, Mathematics, Data Science, or Computer Science.",
      "Analytical mindset with proven skill in translating data into business insights.",
      "Expertise in composing complex SQL queries and building robust data workflows.",
      "Familiarity with data storage layers (warehouses, lakes) and BI tools.",
      "Strong presentation skills to communicate statistical results to stakeholders."
    ]
  },
  "Design": {
    titles: [
      "UI/UX Designer", "Product Designer", "Visual Designer", "Graphic Designer",
      "Interaction Designer", "Motion Designer", "Web Designer"
    ],
    skills: [
      "Figma, Wireframing, Prototyping, Usability Testing", "Figma, Adobe Creative Suite, Visual Design",
      "Adobe Illustrator, Photoshop, Indesign, Typography", "Sketch, Figma, Interaction Design, User Journeys",
      "After Effects, Premiere Pro, Motion Graphics, Storyboarding"
    ],
    reqs: [
      "Portfolio demonstrating clean user-centric layouts and polished visual hierarchy.",
      "Proficiency in modern design tools (Figma, Sketch, or Adobe Creative Suite).",
      "Ability to translate complex user workflows into clean, intuitive wireframes.",
      "Understanding of design systems, responsive typography, and mobile-first rules.",
      "Excellent communication for presenting concepts and incorporating feedback."
    ]
  },
  "Product Management": {
    titles: [
      "Product Manager", "Associate Product Manager", "Technical Product Manager",
      "Product Owner", "Director of Product"
    ],
    skills: [
      "PRD Writing, Agile, Scrum, Product Strategy, JIRA", "SQL, Google Analytics, Product Metrics, A/B Testing",
      "API Designs, Technical PRDs, System Architecture, Agile", "Product Lifecycle, Roadmap Planning, Stakeholder Management"
    ],
    reqs: [
      "Experience driving product discovery, launch, and iterative optimizations.",
      "Ability to write descriptive Product Requirement Documents (PRDs) and user stories.",
      "Strong cross-functional collaboration skills with Engineering, Design, and Marketing.",
      "Data-driven decision making with familiarity in analytics suites.",
      "Excellent communication, prioritization frameworks (e.g. RICE), and agile mindset."
    ]
  },
  "Marketing": {
    titles: [
      "Digital Marketing Specialist", "Growth Marketer", "SEO Specialist", "Content Writer",
      "Social Media Manager", "Brand Manager", "Performance Marketing Manager"
    ],
    skills: [
      "Google Ads, Meta Ads, SEO, Google Analytics", "SEO, SEM, Keyword Research, Ahrefs, SEMrush",
      "Copywriting, Content Strategy, SEO, Blogging", "Social Media Analytics, Brand Campaigns, Copywriting",
      "Google Tag Manager, Meta Pixel, Performance Marketing, Budgets"
    ],
    reqs: [
      "Experience planning and executing growth or content marketing campaigns.",
      "Excellent copywriting, verbal storytelling, and communication skills.",
      "Comprehension of SEO, SEM, conversion tracking pixels, and analytics consoles.",
      "Creative problem solver with track record of maximizing ROAS on ad budgets.",
      "Eager to test, iterate, and adapt to consumer market trends."
    ]
  },
  "Operations & Sales": {
    titles: [
      "Business Development Executive", "Sales Manager", "Operations Associate",
      "Customer Success Specialist", "Account Executive", "Inside Sales Representative"
    ],
    skills: [
      "Sales Pitch, Lead Generation, Cold Calling, CRM", "Operations Management, Supply Chain, Logistics",
      "Customer Relationship Management (CRM), Communication, Troubleshooting",
      "Account Management, Client Retention, Negotiation, Presentation"
    ],
    reqs: [
      "Degree in Business Administration, Marketing, or related fields.",
      "Outstanding communication, interpersonal, and negotiation capabilities.",
      "Familiarity with CRM tools (Salesforce, HubSpot) and office suites.",
      "Goal-oriented mind with demonstrated ability to hit monthly and quarterly quotas.",
      "Strong organization skills to manage customer onboarding and support workflows."
    ]
  }
};

const CATEGORIES = Object.keys(CATEGORIES_DATA);

// 3. Realistic Locations
const INDIAN_CITIES = [
  "Bengaluru, Karnataka", "Mumbai, Maharashtra", "Pune, Maharashtra", "Noida, Uttar Pradesh",
  "Gurugram, Haryana", "Hyderabad, Telangana", "Chennai, Tamil Nadu", "Kolkata, West Bengal",
  "New Delhi, Delhi", "Ahmedabad, Gujarat", "Jaipur, Rajasthan", "Kochi, Kerala"
];

const FOREIGN_CITIES = [
  "San Francisco, California, USA", "New York City, New York, USA", "Seattle, Washington, USA",
  "London, United Kingdom", "Singapore", "Dublin, Ireland", "Berlin, Germany",
  "Sydney, Australia", "Tokyo, Japan", "Toronto, Canada"
];

// Helper to generate a random job
function generateJob(index, recruiter) {
  const category = CATEGORIES[index % CATEGORIES.length];
  const catData = CATEGORIES_DATA[category];
  
  const title = catData.titles[index % catData.titles.length];
  const skillsIndex = index % catData.skills.length;
  const skills = catData.skills[skillsIndex];
  
  // Mix locations: 85% Indian cities, 15% foreign cities
  const isIndian = (index % 100) < 85;
  const location = isIndian 
    ? INDIAN_CITIES[index % INDIAN_CITIES.length]
    : FOREIGN_CITIES[index % FOREIGN_CITIES.length];

  // Salary Range
  let salary = "";
  if (isIndian) {
    const lpaMin = 4 + (index % 30);
    const lpaMax = lpaMin + 3 + (index % 10);
    salary = `₹${lpaMin},00,000 - ₹${lpaMax},00,000 / year`;
  } else {
    const kMin = 60 + (index % 100);
    const kMax = kMin + 20 + (index % 40);
    salary = `$${kMin},000 - $${kMax},000 / year`;
  }

  // Type: Full-time, Remote, Contract
  const typeVal = index % 5 === 0 ? "Remote" : (index % 7 === 0 ? "Contract" : "Full-time");

  const company = recruiter.company;
  const applyUrl = `https://www.${getCompanySlug(company)}.com/careers/apply?job_id=s_${index}`;

  const description = `
    <h3>About ${company}</h3>
    <p>We are a forward-thinking organization looking for a talented ${title} to join our growing team. You will have the opportunity to work on industry-defining platforms, leverage modern tech methodologies, and collaborate in an inclusive environment.</p>
    
    <h3>Key Responsibilities</h3>
    <ul>
      <li>Design, implement, and maintain high-quality features in alignment with product roadmaps.</li>
      <li>Write clean, readable, and highly maintainable code with comprehensive test coverage.</li>
      <li>Collaborate closely with product management, product designers, and cross-functional engineers.</li>
      <li>Participate in architectural discussions, code reviews, and help mentor junior team members.</li>
      <li>Identify performance bottlenecks, isolate bugs, and continuously optimize application latency.</li>
    </ul>

    <h3>Requirements</h3>
    <ul>
      <li>Solid engineering foundation with strong focus on ${skills.split(',')[0]} and related frameworks.</li>
      <li>Experience with database schemas, API designs, and code containerization.</li>
      <li>Detail-oriented approach with empathy for user experience and pixel-perfect responsiveness.</li>
    </ul>
  `;

  // Requirements list
  const reqs = [...catData.reqs];
  reqs.push(`Proven practical experience using ${skills.split(',')[0]}.`);
  
  const createdDaysAgo = index % 15;
  const createdDate = new Date();
  createdDate.setDate(createdDate.getDate() - createdDaysAgo);

  return {
    id: `sample_job_${index}`,
    title,
    company,
    logo: "💼",
    category,
    type: typeVal,
    location,
    salary,
    match: Math.floor(Math.random() * 20) + 78,
    description: description.replace(/\s+/g, ' ').trim(),
    skills,
    reqs,
    applyUrl,
    isSample: true,
    recruiterEmail: recruiter.email,
    created_at: createdDate.toISOString()
  };
}

async function run() {
  console.log("Starting sample data generation...");

  // 1. Generate Recruiters
  console.log(`Generating ${companiesList.length} recruiter accounts...`);
  const recruiters = [];
  const users = [];

  companiesList.forEach((company, index) => {
    const slug = getCompanySlug(company);
    const email = `hr@${slug}.com`;
    const recUser = {
      id: `recruiter_${index}`,
      fullName: `${company} HR`,
      email: email,
      password: "12345678",
      role: "recruiter",
      company: company,
      created_at: new Date().toISOString()
    };
    recruiters.push(recUser);
    users.push(recUser);
  });

  // 2. Generate 10,000 jobs
  console.log("Generating 10,000 jobs...");
  const jobs = [];
  for (let i = 0; i < 10000; i++) {
    // Assign to a recruiter sequentially
    const recruiter = recruiters[i % recruiters.length];
    const job = generateJob(i, recruiter);
    jobs.push(job);
  }

  // 3. Write local sample_jobs directory & jobs.json file
  console.log(`Ensuring directory ${SAMPLE_JOBS_DIR} exists...`);
  await fs.mkdir(SAMPLE_JOBS_DIR, { recursive: true });

  console.log(`Writing 10,000 jobs to local sample_jobs file...`);
  await fs.writeFile(SAMPLE_JOBS_FILE, JSON.stringify(jobs, null, 2), "utf-8");
  console.log("Jobs written successfully to local file!");

  // 4. Update local db.json with recruiters
  console.log("Adding recruiter accounts to local db.json...");
  let localDB = { users: [], jobs: [], applications: [], messages: [] };
  try {
    const dbData = await fs.readFile(DB_FILE, "utf-8");
    localDB = JSON.parse(dbData);
  } catch (err) {
    console.log("db.json not found, creating a new one.");
  }

  // Filter out any older recruiter accounts from these companies to prevent duplicates
  localDB.users = localDB.users.filter(u => {
    if (u.role === "recruiter") {
      return !companiesList.includes(u.company);
    }
    return true;
  });

  // Append new recruiters
  localDB.users = [...localDB.users, ...recruiters];
  await fs.writeFile(DB_FILE, JSON.stringify(localDB, null, 2), "utf-8");
  console.log(`Wrote recruiters to local db.json. Users list size is now ${localDB.users.length}`);

  // 5. Connect to MongoDB Atlas (if MONGO_URI is set)
  if (process.env.MONGO_URI) {
    console.log("MONGO_URI detected in .env. Attempting MongoDB seeding...");
    const client = new MongoClient(process.env.MONGO_URI);
    try {
      await client.connect();
      const mongoDb = client.db("jobsarthi");
      
      // Seed recruiters into users collection
      console.log("Seeding recruiters into MongoDB 'users' collection...");
      const usersCollection = mongoDb.collection("users");
      
      // Upsert recruiters
      for (const rec of recruiters) {
        await usersCollection.updateOne(
          { email: rec.email },
          { $set: rec },
          { upsert: true }
        );
      }
      console.log("Recruiters upserted in MongoDB successfully!");

      // Seed jobs into sample_jobs collection (Clear and insertMany for fresh state)
      console.log("Clearing 'sample_jobs' collection in MongoDB...");
      const sampleJobsColl = mongoDb.collection("sample_jobs");
      await sampleJobsColl.deleteMany({});
      
      console.log("Inserting 10,000 jobs into 'sample_jobs' in chunks of 1000...");
      const chunkSize = 1000;
      for (let i = 0; i < jobs.length; i += chunkSize) {
        const chunk = jobs.slice(i, i + chunkSize);
        await sampleJobsColl.insertMany(chunk);
        console.log(`Inserted chunk starting at index ${i}`);
      }
      console.log("MongoDB sample jobs seeding complete!");

    } catch (dbErr) {
      console.error("MongoDB Atlas connection / seeding failed:", dbErr);
    } finally {
      await client.close();
    }
  } else {
    console.log("No MONGO_URI found. Seeding is complete via local files only.");
  }

  console.log("\nSample data generation completed successfully!");
}

run().catch(console.error);
