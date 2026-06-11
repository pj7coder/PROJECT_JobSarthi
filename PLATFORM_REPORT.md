# JobSarthi — Complete Platform Report

## What Is JobSarthi?

JobSarthi is a full-stack AI-powered career and recruitment platform built for the Indian job market. It connects job seekers with recruiters through intelligent matching, AI-driven resume analysis, voice-based mock interviews, and a real-time recruiter pipeline — all in one ecosystem.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Backend | Node.js + Express.js (ES Modules) |
| Database | MongoDB Atlas (primary) + db.json (local dev fallback) |
| AI - Text/Chat | Groq API (LLaMA 3.3 70B) |
| AI - Vision/Docs | Google Gemini 2.5 Flash (multimodal) |
| File Storage | Cloudinary (resumes, photos, certificates) |
| Email | Nodemailer via Vercel SMTP Proxy |
| Auth | Custom JWT (HMAC-SHA256) + bcryptjs |
| Frontend Host | Vercel |
| Backend Host | Render |
| Job Data | Adzuna API + curated local dataset + custom jobCollector scraper |

---

## Architecture Overview

```
User Browser
    │
    ▼
Vercel (Frontend)
  ├── index.html         ← Landing page
  ├── seeker/            ← Seeker portal (9 pages)
  ├── recruiter/         ← Recruiter portal (6 pages)
  ├── api/send-email.mjs ← Vercel SMTP proxy function
  └── api/cron-collect.js← Daily job collection cron

    │ API calls via /api/*
    ▼
Render (Backend — server.js, 3450+ lines)
    ├── Auth routes
    ├── Job listing APIs
    ├── Application APIs
    ├── AI (Groq + Gemini) APIs
    ├── Messaging APIs
    ├── Profile + Resume APIs
    └── Admin APIs
    │
    ▼
MongoDB Atlas
  ├── users collection
  ├── jobs collection
  ├── applications collection
  ├── messages collection
  ├── interviews collection
  └── sample_jobs collection
```

---

## Pages & Features

### Landing Page (`index.html`)

**Purpose:** Public marketing + entry point

**Features:**
- Animated hero section with variable-weight Roboto Flex typography
- Interactive particle/network canvas background
- Liquid glass animated blob backdrop
- Auto-playing hero demo video
- "Choose Your Journey" portal cards (Seeker / Recruiter)
- Scroll-driven Sarthi AI feature panel expansion
- 3D Dome Gallery of 250+ partner company logos
- Feature testimonials / review cards
- Sarthi AI chatbot widget (guest mode)
- Expanding "About" panel inside the sticky header
- Light / Dark mode toggle
- Preloader screen (prevents FOUC)

**JS Libraries used:**
- `js/SplashCursor.js` — fluid cursor effect
- `js/VariableProximity.js` — magnetic text proximity effect
- `js/DomeGallery.js` — 3D rotating company dome (WebGL via ogl.js)
- `js/LogoLoop.js` — infinite scrolling logo strip
- `js/Dock.js` — macOS-style dock animation
- `js/SplitText.js` — character-level text animation
- `js/header.js` — dynamic expanding sticky header

---

### Seeker Portal — 9 Pages

#### 1. `seeker/login_signup.html` — Authentication
- Tab-based Login / Register form
- Role set to `jobseeker` automatically
- JWT token stored in `localStorage`
- Validation: email regex, 8-char password minimum
- Error feedback with remaining lockout attempts
- Redirects to `seeker/index.html` on success

#### 2. `seeker/index.html` — Seeker Dashboard
- Personalized greeting with user name + avatar
- Profile completion progress bar
- Quick stats: applications sent, match score, interviews done
- "Top Matched Jobs" card carousel (pulled from `/api/jobs?email=`)
- AI Sarthi chat assistant widget (authenticated mode)
- Quick links to all portal sections
- Light/dark mode, shared header

#### 3. `seeker/jobs.html` — Job Discovery
- Full job board with live search bar
- Multi-filter sidebar: Category, Location, Job Type, Sort
- Paginated results (20 per page)
- Each job card shows: title, company, location, salary, match %
- Match % calculated server-side using 100-point weighted algorithm:
  - Skills match (40pts), Location (20pts), Role (20pts), Experience (10pts), Work mode (5pts), Salary (5pts)
- Click any job → shared Job Drawer (slide-in panel)
- Job Drawer: full description, requirements, skills tags, Apply button
- Apply flow: sends application to DB + triggers confirmation email

#### 4. `seeker/resume.html` — Resume & Profile Builder
- Upload resume (PDF/DOCX) → parsed by **Gemini 2.5 Flash** multimodal
- Auto-fills: college, degree, CGPA, skills, experience, class 10/12 marks, hobbies, preferred locations, expected CTC, languages
- Upload profile photo → stored on Cloudinary
- Upload certificates (PDF/image) → Gemini extracts certificate title
- Manual edit of all fields
- Skills entered as interactive tag chips
- Save profile → POST `/api/seeker/profile`

#### 5. `seeker/aiinterview.html` — AI Mock Interview (Largest page: 129KB)
- Pre-setup screen: choose Role, Difficulty, Language, Interviewer Persona
- **Roles available:** Full Stack, Frontend, Backend, Data Scientist, DevOps, Product Manager, Mobile Dev, UI/UX Designer, AI/ML Engineer, Economics/Finance Analyst
- **Difficulties:** Beginner, Intermediate, Expert (adaptive — changes based on performance)
- **Languages:** English, Hindi (Devanagari), Hinglish (Latin script)
- **Interviewer Personas:**
  - Default Sarthi
  - Prof. Vikram — ultra-deep technical questioning
  - Dr. Ananya — strict grading, granular critique
- Voice-based: uses Web Speech API for speech-to-text (user speaks answers)
- Text-to-speech: browser SpeechSynthesis reads questions aloud
- Real-time scoring: 0–10 per answer from Groq LLaMA
- Adaptive difficulty: score ≥8 → increases difficulty, score ≤4 → decreases
- Suspicion score: flags if answers contain paste-like patterns or are too short
- Session saved as interview report → `/api/sarthi/interviews` POST
- Analytics dashboard shows past interview history and scores
- Fallback question bank (no API key needed) for offline demo

#### 6. `seeker/analytics.html` — Performance Analytics
- Interview history chart (scores over time)
- Application status breakdown (Applied / Shortlisted / Rejected / Interview Scheduled)
- Skills gap analysis based on applied jobs vs profile skills
- Match score distribution graph

#### 7. `seeker/messages.html` — Recruiter Chat
- Real-time-style messaging thread with recruiter
- After applying, a welcome message from the recruiter auto-appears
- Seeker sends message → backend auto-generates AI recruiter reply via Groq (1.5s delay)
- Grouped by company
- Avatar shown for seeker

#### 8. `seeker/notifications.html` — Notifications
- Application status change alerts
- New message notifications
- System announcements

#### 9. `seeker/calendar.html` — Interview Calendar
- Calendar popup for scheduled interviews
- Built with custom `commonelements/calendarPopup.js`

---

### Recruiter Portal — 6 Pages

#### 1. `recruiter/login_signup.html` — Authentication
- Tab-based Login / Register
- Role set to `recruiter`
- Company name captured on signup

#### 2. `recruiter/index.html` — Recruiter Dashboard
- Welcome panel with company name
- Quick stats: active jobs, total applicants, shortlisted, interviews
- Recent applicant activity feed
- Link cards to all recruiter tools

#### 3. `recruiter/applicants.html` — Applicant Management
- Lists all candidates who applied to this company's jobs
- Each applicant card: name, email, role applied, match %, status badge
- **View Profile drawer:** full candidate profile
  - College, degree, CGPA, skills (chips), experience, class 10/12 marks
  - Resume download/view button (proxied via `/api/resume/view`)
  - Certificate list
  - Profile photo
- Status dropdown: Applied → Shortlisted → Interview Scheduled → Rejected
- Changing status triggers a **status update email** to the candidate automatically
- Match % recalculated server-side from job + candidate skill comparison

#### 4. `recruiter/create_job.html` — Job Posting
- Form: title, category, type, salary, location, skills, description, requirements
- POST to `/api/jobs` → saved to MongoDB
- Job immediately visible in seeker job board

#### 5. `recruiter/messages.html` — Candidate Messaging
- View all message threads from candidates
- Reply to seekers directly
- Messages grouped by candidate

#### 6. `recruiter/analytics.html` — Hiring Analytics
- Pipeline funnel: applied → reviewed → shortlisted → hired
- Applicant skill heatmap
- Application volume over time

---

## Shared Components

### `commonelements/jobDrawer.js`
- Reusable slide-in job detail panel used by seeker dashboard, jobs page, and recruiter portal
- Renders full job: description (with HTML sanitization), skills tags, requirements, apply button

### `commonelements/headers.js`
- Shared navigation header rendered dynamically on all portal pages
- Detects logged-in user, shows avatar + name
- Settings modal: account editor, change password, theme toggle, logout

### `commonelements/calendarPopup.js`
- Minimal calendar popup for interview scheduling

### `css/main.css` (74KB)
- Complete design system: CSS custom properties, dark/light theme tokens
- Component styles: buttons, cards, drawers, modals, badges, chips, tables
- Animations: transitions, hover effects, micro-animations

---

## Backend APIs (server.js)

### Authentication
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/signup` | POST | Register user, hash password, issue JWT, send welcome email |
| `/api/auth/login` | POST | Verify credentials, check lockout, issue JWT |
| `/api/auth/forgot-password` | POST | Generate reset token, send reset email |
| `/api/auth/verify-reset-token` | POST | Validate reset token + expiry |
| `/api/auth/reset-password` | POST | Hash new password, clear token |
| `/api/user/account` | GET | Fetch account details |
| `/api/user/update-account` | POST | Update name, mobile, company |

### Jobs
| Endpoint | Method | Description |
|---|---|---|
| `/api/jobs` | GET | List jobs with pagination, filters, match scoring |
| `/api/jobs/:id` | GET | Single job by ID |
| `/api/jobs` | POST | Create recruiter job posting |
| `/api/jobs/:id/apply` | POST | Submit application + send confirmation email |

### Recruiter
| Endpoint | Method | Description |
|---|---|---|
| `/api/recruiter/applicants` | GET | Enriched applicant list with profile data |
| `/api/recruiter/applicants/:id/status` | POST | Update status + trigger status email |

### AI
| Endpoint | Method | Description |
|---|---|---|
| `/api/sarthi/chat` | POST | Groq-powered chat (guest or authenticated) |
| `/api/sarthi/interview/next` | POST | AI interview question + feedback + scoring |
| `/api/sarthi/interviews` | POST | Save completed interview report |
| `/api/sarthi/interviews` | GET | Fetch interview history by email |

### Seeker
| Endpoint | Method | Description |
|---|---|---|
| `/api/seeker/profile` | GET | Fetch seeker profile |
| `/api/seeker/profile` | POST | Save profile (uploads resume/photo/certs to Cloudinary) |
| `/api/seeker/parse-resume` | POST | Gemini parses resume PDF → structured JSON |
| `/api/seeker/parse-certificate` | POST | Gemini extracts certificate title |

### Messaging
| Endpoint | Method | Description |
|---|---|---|
| `/api/messages` | GET | Fetch message threads (seeker or recruiter view) |
| `/api/messages` | POST | Send message + trigger AI auto-reply from recruiter |

### Admin / Infra
| Endpoint | Method | Description |
|---|---|---|
| `/api/ping` | GET | Health check / wake-up ping |
| `/api/admin/jobs/collect` | ALL | Trigger job aggregation pipeline |
| `/api/admin/test-email` | POST | Send test email via proxy |
| `/api/resume/view` | GET | Proxy-serve Cloudinary resume for in-browser viewing |

---

## AI System — Deep Dive

### Groq (LLaMA 3.3 70B)
- **Chat:** Powers the Sarthi AI assistant on landing page and seeker dashboard
- **Interview Questions:** Generates contextual, adaptive interview questions based on role, difficulty, candidate profile, and full conversation history
- **Interview Feedback:** Scores each answer 0–10, gives 1–2 sentence critique, decides difficulty adjustment
- **Auto-Recruiter Replies:** Generates realistic HR responses to candidate messages
- **JSON mode:** Interview API uses `response_format: json_object` for structured output
- **Temperature:** 0.2 for structured tasks, 0.7–0.85 for creative/conversational tasks

### Google Gemini 2.5 Flash (Multimodal)
- **Resume Parsing:** Receives base64 PDF/DOCX, extracts college, degree, CGPA, skills, experience, marks, hobbies, locations, CTC, languages as JSON
- **Certificate Parsing:** Receives base64 image/PDF, extracts certificate title
- **Retry logic:** 3 attempts with exponential backoff on rate limit (429)
- **Fallback:** If Gemini unavailable, returns realistic mock parsed data

### Groq Vision (LLaMA 3.2 11B Vision)
- Available for image-based document analysis as a fallback

---

## Job Aggregation System (`jobCollector.js`)

- **Round-robin scraper:** Cycles through a list of companies, fetching job listings
- **Adzuna API integration:** Fetches live Indian tech jobs from Adzuna
- **Curated fallback dataset:** 18 hand-crafted Indian jobs from Google, TCS, Razorpay, Zomato, etc.
- **Sample jobs database:** `database/sample_jobs/jobs.json` — large pre-loaded dataset
- **Cron schedule:** Vercel cron runs `/api/cron-collect` daily at midnight
- **Background sync:** Server runs `syncNextCompany()` every 10 minutes in-process
- **Cache:** Jobs cached in-memory for 30 minutes to reduce DB load

---

## Email System

**Architecture:** Render backend → Vercel SMTP proxy → Gmail SMTP → User inbox

**Why this design?** Render Free Tier blocks outbound SMTP (port 587). Vercel serverless functions do not. The backend POSTs to the Vercel `/api/send-email` endpoint with a shared secret, which then sends via Nodemailer + Gmail.

**Emails sent:**
| Trigger | Email Type |
|---|---|
| New user registers | Welcome email with feature overview |
| Application submitted | Application confirmation email |
| Recruiter changes status | Status update email (Shortlisted / Rejected / Interview Scheduled) |
| Forgot password | Password reset link email |

All emails are **custom HTML** with JobSarthi dark-theme branding (dark navy background, sky-blue accents).

---

## Security Layer

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs, 12 salt rounds |
| Session tokens | Custom HMAC-SHA256 JWT, 7-day expiry |
| Brute-force protection | 5-failure account lockout, 15-minute window |
| Rate limiting | 5 tiers: auth (10/15min), AI (20/min), upload (15/10min), forgot-pw (5/hr), general (100/min) |
| CORS | Whitelist-only: jobsarthi.vercel.app + localhost |
| Security headers | HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, CSP |
| NoSQL injection | Regex-escaped user input before MongoDB queries |
| File type limits | MIME validation before Cloudinary upload |
| Payload limits | 10MB default, 50MB only on upload routes |
| Admin protection | `ADMIN_PASSWORD` env var required; bcrypt-hashed |

---

## Design System

**Theme:** Dark-first, glassmorphism-influenced, premium SaaS aesthetic

**Color palette:**
- Background: `#09090b` (near-black), `#18181b`, `#27272a`
- Accent: `#6366f1` (indigo), `#06b6d4` (cyan), `#d946ef` (fuchsia for recruiter)
- Text: `#fafafa` main, `#a1a1aa` muted, `#71717a` dark

**Typography:** Roboto Flex (variable font — weight and optical size animated)

**Animations:**
- Liquid glass blobs (CSS keyframe radial gradients)
- Particle network canvas (vanilla JS WebGL-free)
- Scroll-driven section expansion
- Micro-hover transitions on all interactive elements
- Page preloader with shine animation

---

## File Structure Summary

```
Project_JobSarthi/
├── index.html               ← Landing page
├── change_password.html     ← Password reset page
├── server.js                ← Full backend (3450+ lines)
├── jobCollector.js          ← Job scraping pipeline
├── package.json
├── vercel.json              ← Vercel routing + cron config
├── .env                     ← Secrets (gitignored)
├── .gitignore
├── seeker/                  ← 9 seeker portal pages
├── recruiter/               ← 6 recruiter portal pages
├── api/
│   ├── send-email.mjs       ← Vercel SMTP proxy function
│   └── cron-collect.js      ← Vercel daily cron trigger
├── css/
│   ├── main.css             ← 74KB design system
│   ├── landing.css
│   ├── Dock.css
│   └── LogoLoop.css
├── js/
│   ├── header.js            ← 79KB dynamic header
│   ├── SplashCursor.js      ← Fluid cursor
│   ├── DomeGallery.js       ← 3D company dome
│   ├── LogoLoop.js          ← Scrolling logos
│   ├── Dock.js              ← macOS dock
│   └── SplitText.js         ← Text animation
├── commonelements/
│   ├── jobDrawer.js         ← Shared job detail drawer
│   ├── headers.js           ← Shared portal header
│   └── calendarPopup.js     ← Interview calendar
├── assets/
│   ├── jobsarthilogo.png
│   ├── video1-6.mp4         ← Demo videos
│   └── company/             ← Company logos
└── database/
    └── sample_jobs/jobs.json ← Pre-loaded job dataset
```

---

## Key Numbers

| Metric | Value |
|---|---|
| Total backend lines | 3,450+ |
| Total pages | 17 (1 landing + 9 seeker + 6 recruiter + 1 password reset) |
| API endpoints | 25+ |
| AI models integrated | 3 (Groq LLaMA 70B, Groq Vision 11B, Gemini 2.5 Flash) |
| Email types | 4 |
| Interview roles supported | 10 |
| Job match scoring factors | 6 (skills, location, role, experience, work mode, salary) |
| Rate limiter tiers | 5 |
| Security headers | 7 |
| CSS design system size | 74KB |
| npm dependencies | 7 production, 2 dev |

---

## What Makes JobSarthi Unique

1. **End-to-end AI pipeline** — Resume parsed by vision AI → skills extracted → jobs matched by weighted algorithm → interview conducted by conversational AI → report saved
2. **Adaptive interviews** — Difficulty changes in real-time based on answer quality
3. **Persona-based interviewers** — Prof. Vikram (deep tech), Dr. Ananya (strict grader), Default Sarthi
4. **Multi-language interviews** — English, Hindi, Hinglish
5. **Auto AI recruiter replies** — When a seeker messages, an AI HR agent replies in 1.5 seconds
6. **Full recruiter pipeline** — Post jobs → view applicants → change status → candidate gets emailed automatically
7. **Indian job market focus** — 80+ Indian cities, 30+ states, INR salary, Adzuna India API
8. **SMTP via Vercel proxy** — Solves Render free tier SMTP block elegantly
9. **Dual-host architecture** — Vercel for frontend (fast CDN), Render for backend (persistent process)
10. **Zero external UI libraries** — Pure vanilla CSS and JS, no React/Vue/Tailwind
