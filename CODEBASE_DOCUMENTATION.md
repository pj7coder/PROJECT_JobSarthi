# JobSarthi: AI-Powered Career & Recruitment Ecosystem
## Comprehensive Codebase & Architecture Documentation

This document provides a highly detailed walkthrough of the folders, files, internal components, and logic structures comprising the JobSarthi platform. It details how the backend orchestration, automated job aggregation, database abstractions, AI modules, and frontend pages connect to form a production-ready application.

---

## 1. Directory Tree Overview

```text
Project_JobSarthi/
├── .env                          # Configuration variables (API keys, Database URI, Ports)
├── .gitignore                    # Spec of files ignored by Git version control
├── vercel.json                   # Vercel Serverless Routing, Rewrite, and Cron schedules
├── package.json                  # Node.js project manifest (dependencies, entrypoint, run scripts)
├── package-lock.json             # Locked dependency tree specification
├── server.js                     # Primary backend Express server & core API endpoints
├── jobCollector.js               # Automated job crawler, ATS detector, and pipeline scheduler
├── db.json                       # Local file-system JSON database fallback
├── generate_sample_data.js       # Utility to populate db.json with structured sample entities
├── index.html                    # Public home page / guest portal (rich effects, about panel)
├── ngrok.exe                     # Utility to tunnel local port 3000 to public HTTPS (development)
│
├── api/                          # Vercel Serverless Functions
│   └── cron-collect.js           # Scheduled serverless entrypoint for Daily Job Aggregator
│
├── commonelements/               # Reusable shared templates
│   └── headers.js                # Shared HTML for Guest, Seeker, and Recruiter navbar states
│
├── database/                     # Seed and static data assets
│   └── sample_jobs/
│       └── jobs.json             # Large offline database of pre-collected jobs (cold start)
│
├── css/                          # CSS Stylesheets
│   ├── Dock.css                  # Styles for the floating menu dock
│   ├── LogoLoop.css              # Stylings for ticker-style logo animations
│   ├── VariableProximity.css     # CSS for the responsive hover-proximity title layout
│   ├── landing.css               # Landing page specific alignments and animations
│   └── main.css                  # Core global stylesheet (theme variables, layouts, grids)
│
├── js/                           # Shared JS utilities, libraries, and animations
│   ├── AboutPhysics.js           # 2D canvas physics simulation for the about menu
│   ├── Dock.js                   # Interactive logic for the floating utility dock
│   ├── DomeGallery.js            # 3D interactive gallery rendering engine
│   ├── LogoLoop.js               # Javascript handling for infinite brand loops
│   ├── SplashCursor.js           # Fluid simulation WebGL-based mouse trail cursor effect
│   ├── SplitText.js              # Typography effect splitting texts for entry transitions
│   ├── VariableProximity.js      # Hover-sensitive typographic layout scaling calculations
│   ├── header.js                 # Shared header injection, dropdown menus, and theme setup
│   └── ogl.js                    # Minimalist WebGL utility library powering fluid simulations
│
├── seeker/                       # Job Seeker Portal Frontend
│   ├── index.html                # Seeker Dashboard (recent actions, quick match metrics)
│   ├── resume.html               # Profile setup, Resume Builder & Gemini Document Parser
│   ├── jobs.html                 # Job Search, Filters, and Algorithmic Matching display
│   ├── aiinterview.html          # Interactive AI Interview Avatar (Voice / Proctoring / Score card)
│   ├── messages.html             # Chat window communicating with Recruiter Auto-Agents
│   ├── analytics.html            # Visual graphs plotting match ratios & domain suitability
│   ├── notifications.html        # Notification inbox tracker
│   └── login_signup.html         # Job Seeker Signup/Login gateway
│
└── recruiter/                    # Recruiter Portal Frontend
    ├── index.html                # Recruiter Dashboard (active roles, candidate count summaries)
    ├── create_job.html           # Job Posting Publisher Form
    ├── applicants.html           # Applicant Screening Console (resumes, match scores, actions)
    ├── messages.html             # Recruiter Chat Console with Candidates
    ├── analytics.html            # Recruitment Analytics Dashboard
    └── login_signup.html         # Recruiter Signup/Login gateway
```

---

## 2. Configuration & Manifests

### `package.json`
- **Purpose**: Defines dependencies, scripts, and runtime settings.
- **Key Lines**:
  - `type: "module"`: Dictates standard ES Module syntax (`import`/`export`) instead of CommonJS (`require`).
  - `scripts.start`: Launches `node server.js` for production execution.
  - `scripts.dev`: Runs `nodemon --ignore db.json --ignore scratch/ server.js` to automatically reload the Express server upon changes, while ignoring updates to local database files and scratch areas to prevent loop-restarts.
  - `dependencies`:
    - `express`: REST API backend routing framework.
    - `mongodb`: Official Node.js driver to communicate with MongoDB Atlas.
    - `cloudinary`: SDK used to store and optimize uploaded resumes (PDFs) and profile pictures.
    - `cors`: Cross-Origin Resource Sharing middleware.
    - `dotenv`: Parses environment values from the local `.env` file into `process.env`.
    - `nodemon` / `vercel`: Developer tools for continuous testing and serverless deployments.

### `vercel.json`
- **Purpose**: Configures Vercel serverless platform deployments.
- **Key Modules**:
  - `crons`: Establishes a daily schedule at midnight (`0 0 * * *`) that triggers `/api/cron-collect` on the Vercel serverless runtime to execute job aggregation.
  - `rewrites`: Automatically routes any `/api/...` calls (excluding `cron-collect`) to `https://project-jobsarthi.onrender.com/api/:path` (or target server host), enabling a split-architecture hosting (static frontend on Vercel, server API on a platform like Render).

### `.env`
- **Purpose**: Key-value store for secret tokens. It holds:
  - `PORT`: TCP port for Express.
  - `MONGO_URI`: Connection string to the MongoDB Atlas cluster.
  - `GROQ_API_KEY`: Key to invoke Llama 3 models on Groq for chatbot responses, interview avatars, and HR auto-replies.
  - `GEMINI_API_KEY`: Key to invoke Gemini 2.5 Flash for document parsing and OCR.
  - Cloudinary configurations: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
  - Adzuna parameters: `ADZUNA_APP_ID`, `ADZUNA_API_KEY` (used for fallback job seeding in India).

---

## 3. Database & Seeding Pipeline

### `db.json` (Local Database Fallback)
When `MONGO_URI` is omitted or network lookup fails, JobSarthi automatically switches to `db.json` on the filesystem. It holds four key collections:
1. `users`: Credentials, user type (seeker/recruiter), profile fields, uploaded resumes, and certificates.
2. `jobs`: Both manually posted jobs by recruiters and aggregated positions crawled from external boards.
3. `applications`: Tracks which candidate applied for which job, current status (Applied, Interviewing, Offered, Rejected), and timestamp.
4. `messages`: Thread history mapping conversations between recruiters and job seekers.

### `generate_sample_data.js`
- **Purpose**: A standalone seeding script.
- **Use Case**: Run `node generate_sample_data.js` to clear and recreate a fully populated `db.json` mock database. It generates dummy recruiters, seekers, mock applications, and message logs for demonstration and testing.

### `database/sample_jobs/jobs.json`
- **Purpose**: Contains thousands of pre-collected actual jobs.
- **Use Case**: Used as an offline cache. When the server launches, it reads this file to cold-start the database with actual job roles, avoiding an empty interface when live crawlers haven't finished executing.

---

## 4. Backend Architecture: `server.js`

This 2,600+ line server handles Express setup, MongoDB connection management, database abstractions, AI integration (via Groq and Gemini), file uploading proxies, and APIs.

### 4.1 Database Service Wrapper (`dbService`)
To keep API code clean, `server.js` defines a unified CRUD service `dbService` that checks if MongoDB Atlas (`mongoDb` client) is connected. If yes, it routes requests to MongoDB collections; if not, it reads/writes to `db.json` using async `fs/promises`.
- `findUserByEmail(email)`: Queries the `users` collection.
- `createUser(user)`: Inserts a new user.
- `getJobs()`: Merges database jobs (manually created and crawled) with in-memory cached sample jobs, then filters out blacklisted entities. It implements a **30-minute in-memory cache** to prevent database lookup lag on high traffic.
- `createApplication(app)`: Saves a candidate's application.
- `getMessages(query)` / `createMessage(msg)`: Syncs active candidate/recruiter communication threads.

### 4.2 Automated Seeding Pipeline
On server initialization, if `jobs` or `users` collections in MongoDB are empty, the server seeds them from `db.json` assets in the background. It also calls:
- `loadCachedSampleJobs()`: Loads the 22MB sample jobs cache into memory.
- `autoAggregateJobs()`: Checks if the database is populated. If empty:
  1. Attempts to connect to the **Adzuna Jobs Search API** (if credentials exist) targeting Developer roles in India.
  2. Parses results, converts salaries to Indian Rupees (INR LPA), formats schema structure, and inserts into DB.
  3. If API keys are missing or fail, it fallbacks to a list of pre-curated Indian jobs (e.g., Google India, Razorpay, TCS, Jio, Zomato, CRED, swiggy, Zoho).

### 4.3 Algorithmic Match-Score Engine
An essential feature of the jobs page is `calculateMatchScore(job, profile)`. This is a pure-JavaScript heuristic scoring engine that runs on the server whenever a seeker requests the job listings:
1. **Hard Filters**:
   - Rejects the job (returns `0%` match score) if the job's required experience exceeds the user's experience by more than 3 years.
   - Rejects the job if the candidate prefers onsite work, the job is not remote, and the job location belongs to a different country.
   - If both the job and candidate have skills defined, it checks for at least one overlapping match. If there is `0%` skill overlap, the job is filtered out.
2. **Multi-Tier Scoring (Total Max 100 points)**:
   - **Location Match (Up to 40 pts)**: Exact city match gives 30 pts, state match 25 pts, country-only match (India) 20 pts. Remote matches earn a bonus.
   - **Skill Match (Up to 40 pts)**: Calculates the ratio of matching skills. Standardizes spelling variations (e.g., `reactjs` vs `react.js`, `js` vs `javascript`).
   - **Role Match (Up to 30 pts)**: Compares job titles with the user's degree and work summary fields.
   - **Experience Match (Up to 20 pts)**: Higher points for matching exact years of experience, decaying as the experience gap expands.
   - **Work Mode (Up to 15 pts)**: Scoring based on alignment of remote vs. onsite preferences.
   - **Salary (Up to 20 pts)**: Rewards alignment where the job salary meets or exceeds the seeker's expectations.

### 4.4 AI Chatbot and Sarthi Advisor
- **Route**: `POST /api/sarthi/chat`
- **Workflow**: Serves guest users on the landing page. If `GROQ_API_KEY` is present, it formats a history array and asks Llama 3 to guide the candidate. If the guest asks about profile settings or resume score reviews, Sarthi detects this and reminds them they are a guest user, directing them to login.

### 4.5 AI Mock Interview Engine
- **Route**: `POST /api/sarthi/interview/next`
- **Core Parameters**: `role`, `difficulty`, `history` (previous QA pairs), `userAnswer`, `interviewerAbility`, `language`.
- **Logic**:
  1. If `role` is set to "From your resume", the backend reviews candidate profile tags to determine the target role (e.g. Frontend Developer, UI/UX Designer, Economics Analyst, etc.).
  2. Formulates a system prompt styling Sarthi as an interviewer.
  3. **Personality Abilities**:
     - `vikram` (Prof. Vikram): Focuses on low-level mechanical engineering, internal engines, memory limits, and hardware bottlenecks.
     - `ananya` (Dr. Ananya): Evaluates strictly, grades responses lower, and provides granular critique.
  4. **Language Selection**:
     - `en`: Standard English.
     - `hi`: Questions and responses in Hindi (Devanagari script).
     - `hinglish`: Blended Hindi and English text output using the Latin/English alphabet (e.g., "*Aap performance optimization ke liye kya step lenge?*").
  5. The LLM (Llama 3 on Groq or Gemini 2.5) evaluates the user's response to the previous question and outputs a JSON object containing:
     - `feedback`: Constructive review of the answer.
     - `score`: Score out of 10.
     - `difficultyChange`: String (`increase`, `decrease`, `maintain`) to dynamically alter the difficulty of subsequent questions.
     - `nextQuestion`: A logical, contextual follow-up question.
  6. **Local Fallback**: If LLM API limits are exceeded or keys are not configured, the endpoint switches to a predefined index of questions grouped by role and difficulty, computes a local keyword score, and routes questions smoothly.

### 4.6 Resume & Certificate Parsers (OCR)
- **Routes**: `POST /api/seeker/parse-resume` and `POST /api/seeker/parse-certificate`
- **Workflow**: Receives document assets as Base64 strings.
  - Sends the raw bytes directly to **Gemini 2.5 Flash** using multimodal inputs.
  - Directs Gemini to extract education (college, degree, CGPA), skills, experience, school marks, and locations, formatting the response strictly as a JSON object matching the user profile schema.
  - Automatically updates the seeker's profile database entry upon extraction.

### 4.7 File Proxies & Storage Integrations
- **Cloudinary Helpers**: If profile parameters include Base64 inputs, the server uploads them to Cloudinary. It uploads images as `image` resources and resumes (PDFs/DOCX) as `raw` files to bypass security delivery limits.
- **Proxy Endpoint (`GET /api/resume/view`)**: Fetches PDFs from storage and sends them back to the client browser using correct headers (`Content-Type: application/pdf`). This bypasses mixed-content issues or Cloudinary access restrictions in strict company environments.

---

## 5. Job Crawling Engine: `jobCollector.js`

This utility module is JobSarthi's backend scraper and crawler. It handles external API queries, extracts listing URLs, and manages scheduling.

### 5.1 DNS Helper
```javascript
if (!process.env.VERCEL) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}
```
In domestic developer environments, local DNS servers can sometimes drop or block connection requests to MongoDB Atlas connection string hosts. `jobCollector.js` overrides local node resolution servers to use Google and Cloudflare DNS, preventing system boot failures. This code block is disabled on Vercel deployments to prevent serverless execution faults.

### 5.2 ATS Detection (`detectATS`)
Analyzes the page HTML or career link URL. Returns the platform name if matching:
- **Greenhouse**: Contains `greenhouse.io` or `grnh.se`.
- **Lever**: Contains `lever.co` or `jobs.lever.co`.
- **Ashby**: Contains `ashbyhq.com` or `ashby-jobs`.
- **SmartRecruiters**: Contains `smartrecruiters.com`.
- **Workday**: Contains `myworkdayjobs.com`.

### 5.3 Board-Specific API Fetchers
- **Greenhouse (`fetchGreenhouseJobs`)**: Hits Greenhouse's boards API: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`. Parses full descriptions, locations, and departments.
- **Lever (`fetchLeverJobs`)**: Accesses Lever postings JSON: `https://api.lever.co/v0/postings/{companyId}?mode=json`.
- **Ashby (`fetchAshbyJobs`)**: Leverages Ashby's job board endpoints: `https://api.ashbyhq.com/posting-api/job-board/{boardId}`.
- **SmartRecruiters (`fetchSmartRecruitersJobs`)**: Performs a two-step lookup: first collects the posting list, then iterates through individual posting detail APIs to fetch complete job descriptions.
- **Scraper Scaffolding (`scrapeCareerPage`)**: Used when a company does not use a recognized ATS. It fetches the raw HTML page, parses links using heuristics regex looking for career paths (`/job/`, `/careers/`, `/posting/`), and extracts job titles.

### 5.4 Target Company Registry & Scheduler (`syncNextCompany`)
- **TARGET_COMPANIES**: A curated list containing 100 tech companies (e.g., Figma, Stripe, OpenAI, Vercel, Linear, Anthropic, Netflix) mapped to their respective ATS type and token.
- **Round-Robin Execution**: To avoid hitting API rate limits or timing out serverless processes, `syncNextCompany()` queries the database for the company synchronization timestamp. It identifies the company that has not been synchronized for the longest duration, collects its listings, updates its individual listings inside the database, and saves the new sync timestamp.
- **Trigger Mechanisms**:
  1. Triggered on server start in the background.
  2. Scheduled inside `server.js` to run every 10 minutes.
  3. Handled via the Vercel Daily Cron job.
  4. Triggered manually by administrators via `/api/admin/jobs/collect`.

---

## 6. Frontend Code & UI Components

The frontend is constructed using pure HTML5 semantic layouts, Vanilla CSS custom properties, and Vanilla JavaScript.

### 6.1 Shared Header System: `commonelements/headers.js` and `js/header.js`
To avoid replicating menus across dozens of HTML pages, `headers.js` exports three primary templates:
1. `headerLandingHTML`: Displays links to Home, Portals, Reviews, and Sarthi AI, along with Finder and Recruiter authentication buttons.
2. `headerSeekerHTML`: Navigation links pointing to Dashboard, Resume, Jobs, Analytics, and Messages.
3. `headerRecruiterHTML`: Navigation links pointing to Dashboard, Jobs Created, Applicants, Analytics, and Messages.
- **Setting Integrations**: All headers embed settings panels to toggle dark/light themes and toggle or adjust the density of the splash cursor animation.
- **`js/header.js`**: Automatically run by all pages on load. It reads the user's role from local storage, dynamically injects the appropriate header, queries the `/api/seeker/profile` API to render user names/avatar initials inside the dropdown, and configures event listeners for notifications.

### 6.2 Visual Effects & Libraries (`js/` and `css/`)
- **`ogl.js`**: A fast WebGL library. It handles frame shaders and vertices initialization.
- **`SplashCursor.js`**: Draws interactive fluid simulation coordinates. Clicking or dragging creates a colorful fluid ripple trail on the webpage.
- **`VariableProximity.js`**: Dynamically scales the `font-weight` and spacing of text headers based on the distance between the user's mouse cursor and the letters.
- **`AboutPhysics.js`**: Simulates gravity and collision physics. When users click the "About" panel in the header, blocks represent core values, dropping down and colliding with bounding boxes.

---

## 7. Portal Page Breakdown

### 7.1 Landing Page (`index.html`)
The gateway for guest users. It contains hero cards, scrolling brand ticker boards (LogoLoop), portals cards (directing users to Seeker or Recruiter entry points), and an interactive chat terminal running Sarthi AI.

### 7.2 Seeker Portal (`seeker/`)
1. **Dashboard (`index.html`)**: Summarizes recent application counts and lists recommendations based on match score. Contains a quick-start card to launch mock interviews.
2. **Resume Builder (`resume.html`)**: Allows candidates to fill out their profile details. Includes a **drag-and-drop resume parser** that automatically extracts information from uploaded files via Gemini 2.5 Flash, pre-populating form fields.
3. **Jobs Search (`jobs.html`)**: An advanced job board. Includes multi-select filters for locations, categories, and job types (remote/onsite). Displays matching skill badges and highlights matching percentages.
4. **AI Interview (`aiinterview.html`)**: The core of the mock interview system. It accesses user microphone inputs, transcribes text, starts a 60-second countdown timer per question, and implements tab-change and full-screen proctoring alerts. After 5 questions, it renders a performance dashboard grading technical depth and communication skills.
5. **Messages (`messages.html`)**: A chat window to communicate with recruiter profiles. Sending a message triggers an asynchronous response from an AI agent customized to that specific company's HR profile.
6. **Analytics (`analytics.html`)**: Renders custom SVG charts showing match distributions and highlighting skill gaps compared to active postings.
7. **Notifications (`notifications.html`)**: Lists alerts such as new job postings or scheduled interviews.

### 7.3 Recruiter Portal (`recruiter/`)
1. **Dashboard (`index.html`)**: Displays high-level cards showing total job postings, candidate applications, and average matching scores.
2. **Create Job (`create_job.html`)**: A form to publish new roles. It captures titles, salary ranges, required skills, and custom requirements.
3. **Applicants Screen (`applicants.html`)**: A pipeline interface. Shows card views of applicants. Clicking an applicant displays their resume via the PDF proxy, lists extracted details (college, CGPA), calculates their match score, and provides buttons to change the status (e.g. advance to Interviewing, send offer, or reject).
4. **Messages (`messages.html`)**: A communication panel for recruiters to converse with applicants.
5. **Analytics (`analytics.html`)**: Provides reports on time-to-hire, channel yield, and candidate match scores.

---

## 8. State & Authentication Flow

JobSarthi uses client-side session storage to manage local state:
1. **Registration/Login**: When users submit forms, the backend validates credentials against the database. If correct, it returns user details.
2. **Local Storage**: The frontend saves the response inside key objects:
   - `loggedInUserEmail`: Unique index used for API calls.
   - `loggedInUserName`: Used to customize greetings.
   - `userRole`: Standardizes headers and blocks access to unauthorized paths.
3. **Guards**: Page headers check for these storage variables. If missing or role mismatch occurs, the page redirects the user to the landing login screen.
