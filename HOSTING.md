# JobSarthi Hosting Guide (5-10 Users)

This guide explains how to start your new Node.js backend and host the JobSarthi website so that it can be used simultaneously by 5-10 people.

---

## 1. Quick Start: Running the Server Locally

We have already created the server and installed the dependencies. To start the backend:

1. Open your terminal in the `Project_JobSarthi` directory.
2. Run the start command:
   ```bash
   npm start
   ```
3. The server will launch and display:
   `JobSarthi server running at http://localhost:3000`
4. Open `http://localhost:3000` in your web browser.

---

## 2. Option A: Local Network Sharing (Same Wi-Fi) — *Easiest & Free*

If the 5-10 people are in the same room/office and connected to the same Wi-Fi network, they can access your site immediately using your computer's local IP address:

1. **Find your Local IP Address:**
   - On Windows: Open Command Prompt and type `ipconfig`. Look for **IPv4 Address** (e.g., `192.168.1.15`).
   - On macOS/Linux: Open Terminal and type `ifconfig` or `ip a`.
2. **Access the Website:**
   - Tell your users to open their browsers and navigate to:
     `http://YOUR_LOCAL_IP:3000` (e.g., `http://192.168.1.15:3000`)
3. Done! They can sign up, create jobs, and chat with Sarthi AI simultaneously.

---

## 3. Option B: ngrok (Public Internet URL) — *Free & Instant Access Anywhere*

If your users are remote (not on the same Wi-Fi), you can use **ngrok** to create a secure public tunnel to your local server for free:

1. **Install ngrok:**
   - Go to [ngrok.com](https://ngrok.com) and create a free account.
   - Download ngrok and authenticate it using the command shown in your dashboard:
     ```bash
     ngrok config add-authtoken YOUR_AUTHTOKEN
     ```
2. **Expose your Local Server:**
   - With your Node server running (`npm start`), open a new terminal window and run:
     ```bash
     ngrok http 3000
     ```
3. **Share the Link:**
   - ngrok will generate a secure public URL (e.g., `https://a1b2-34-56-78.ngrok-free.app`).
   - Anyone in the world can open this link on their phone or PC to access your JobSarthi application.

### How to Remove/Bypass the ngrok Browser Warning Page
When visitors click your ngrok link, they will see a warning page ("*You are about to visit... This website is served for free through ngrok.com...*"). This is a security feature enforced by ngrok on all free-tier accounts. Here is how to bypass or remove it:

*   **Option 1: Manual Click (Easiest)**
    - Simply click the **"Visit Site"** or **"Decline Warning"** button on the warning page. Once clicked, ngrok sets a cookie in your browser, and you won't see the warning page again for 7 days on that device.
*   **Option 2: Use Cloudflare Tunnel (Best Free Alternative — NO Warning Pages)**
    - If you want a public URL that has **no warning pages at all** for your users, you can use Cloudflare's free Quick Tunnels:
      1. Keep your Node server running (`npm start`).
      2. In a new terminal window, run:
         ```bash
         npx cloudflared tunnel --url http://localhost:3000
         ```
      3. Look at the output for a URL ending in `.trycloudflare.com` (e.g., `https://some-random-words.trycloudflare.com`).
      4. Share this link with your users. They will access your website directly with **no interstitial warning screens**.
*   **Option 3: Add a Custom Header (For Programmatic/API Requests)**
    - If you are accessing your ngrok URL via API clients, you can bypass the warning by adding the header `ngrok-skip-browser-warning` with any value (e.g., `true` or `1`) to your request.
*   **Option 4: Upgrade ngrok**
    - Upgrading to a paid ngrok plan automatically removes the warning page for all visitors.

---

---

## 4. Option C: Render / Railway (Cloud Hosting) — *24/7 Online Access*

For permanent cloud hosting, you can deploy the app to **Render** (free tier):

1. **Upload your code to GitHub:**
   - Initialize git in your project: `git init`
   - Commit all files: `git add .` and `git commit -m "feat: backend integration"`
   - Create a repository on GitHub and push your code there.
2. **Deploy on Render (render.com):**
   - Create a free account on Render.
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository.
3. **Configure Settings:**
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. **Deploy:**
   - Render will build and deploy the app, providing you with a free public URL (e.g., `https://jobsarthi.onrender.com`).

---

## 5. (Optional) Configuring Sarthi AI with Gemini API Key

We have included a **Local Smart Fallback** that allows the chatbot to reply intelligently out of the box. To activate full dynamic generative replies:

1. Get a free Gemini API key from Google AI Studio.
2. Open the `.env` file in `Project_JobSarthi`.
3. Add your key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
4. Restart your server.
