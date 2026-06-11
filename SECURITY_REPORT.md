# JobSarthi Security Architecture & Hardening Report

This report outlines the comprehensive security measures implemented on the JobSarthi backend (`server.js`) to protect application assets, prevent denial-of-service/brute-force attacks, secure user sessions, and shield expensive third-party APIs (Groq, Gemini, Cloudinary, and SMTP) from abuse.

---

## 1. Security Feature Breakdown

### 🛡️ Rate Limiting & Denial of Service (DoS) Defense
An intelligent, window-based, in-memory rate limiter has been integrated directly into the Express pipeline without requiring external dependencies (saving memory and startup overhead). It tracks requests per IP address per route.

*   **Authentication Limiter (`/api/auth/signup`, `/api/auth/login`)**:
    *   *Limit*: 10 attempts per IP every 15 minutes.
    *   *Purpose*: Blocks credential stuffing and dictionary attacks.
*   **Forgot Password Limiter (`/api/auth/forgot-password`)**:
    *   *Limit*: 5 attempts per IP every 1 hour.
    *   *Purpose*: Prevents mail spamming/exhaustion of email proxy limits.
*   **AI Rate Limiter (`/api/sarthi/chat`, `/api/sarthi/interview/next`)**:
    *   *Limit*: 20 requests per IP every 1 minute.
    *   *Purpose*: Shields Groq/Llama endpoints from script-based automation and billing spikes.
*   **Upload Rate Limiter (`/api/seeker/parse-resume`, `/api/seeker/parse-certificate`)**:
    *   *Limit*: 15 file parsing requests per IP every 10 minutes.
    *   *Purpose*: Avoids CPU starvation and storage flooding from mass file uploads.
*   **General API Limiter (`/api/*`)**:
    *   *Limit*: 100 requests per IP every 1 minute.
    *   *Purpose*: General endpoint flooding protection.

---

### 🔒 Brute-Force & Account Lockout Layer
When attackers attempt to brute-force a specific user account across multiple IPs, standard rate limiting isn't enough. JobSarthi now has user-specific lockout tracking:
*   **Failure Threshold**: Max 5 incorrect login attempts.
*   **Lockout Window**: 15 minutes.
*   **User Feedback**: Tells the user exactly how many attempts they have remaining (e.g., *"Invalid email or password. 3 attempts remaining before account lockout"*). Once locked out, it returns HTTP 429 with the remaining duration.

---

### 🔑 Authentication & Session Integrity (JWT)
JobSarthi previously relied on insecure, unvalidated frontend states. The backend now issues cryptographically signed JWT tokens using HMAC-SHA256:
*   **Token Expiration**: Hard 7-day session lifetime.
*   **Payload Encryption**: Stores user ID, email, role, and company.
*   **Protected Access Hooks**: Includes a `requireAuth` and `requireRole(...roles)` middleware, ready to secure dashboards and private applicant data.
*   **Upgrade Verification**: Plaintext passwords are automatically upgraded to secure `bcrypt` hashes (with a high cost factor of 12 rounds) on their next successful login.

---

### 🌐 Strict CORS (Cross-Origin Resource Sharing) Controls
CORS was previously completely open (`*`), allowing any malicious site on the internet to send credentials or fetch data from your API.
*   **Secure Whitelist**: Access is locked down exclusively to:
    *   `https://jobsarthi.vercel.app` (Production)
    *   `https://jobsarthi-git-main-pj7coders-projects.vercel.app` (Branch Main)
    *   `https://jobsarthi-pj7coders-projects.vercel.app` (Staging)
    *   Localhost development ports (`3000`, `5173`, `127.0.0.1`)
*   **Verification**: All foreign requests are actively blocked with warning logs.

---

### 🧱 HTTP Hardening & Security Headers
Standard security headers are injected into every server response to protect users on the client side:
*   **`X-Content-Type-Options: nosniff`**: Prevents browsers from executing MIME-sniffed payloads.
*   **`X-Frame-Options: SAMEORIGIN`**: Stops clickjacking attacks by blocking the site from running in an iframe on foreign pages.
*   **`Strict-Transport-Security`**: Enforces HTTPS (HSTS) with subdomains preloaded.
*   **`X-Powered-By`**: Fingerprint header is deleted to prevent scanners from identifying the Node.js/Express environment.

---

### 📝 Input Sanitization & Payload Limits
*   **Default Limits**: Max request body payload size is reduced from **50mb** to **10mb** to protect the event loop.
*   **Targeted Scaling**: The `/api/seeker/parse-resume` and `/api/seeker/parse-certificate` endpoints use a separate parser that allows up to **50mb** specifically for base64 documents.
*   **Sanitization Rules**: Sanitization functions strip HTML brackets (`<` and `>`) from registration data to block basic XSS, enforce strict email regex patterns, and mandate an 8-character password minimum.

---

## 2. Configuration Matrix (Required Environment Variables)

Ensure these are configured in your dashboards to maintain the security state:

### Render Dashboard (Backend Settings)
*   **`JWT_SECRET`**: A long, secure random password (e.g. `jobsarthi_session_secret_xyz`). If not set, a random secret is created on every server reboot, which will log out all current users.
*   **`EMAIL_PROXY_SECRET`**: Must match Vercel’s secret to allow secure mail relaying.

### Vercel Dashboard (Frontend Settings)
*   **`EMAIL_PROXY_SECRET`**: Secure key to prevent unauthorized endpoints from using Vercel to send SMTP mail.
