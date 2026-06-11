import nodemailer from "nodemailer";
import dns from "dns";

// Helper to parse JSON body from Vercel serverless request (req.body is not auto-parsed)
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    // If body is already parsed (e.g. local dev), return it
    if (req.body && typeof req.body === "object") {
      return resolve(req.body);
    }
    let raw = "";
    req.on("data", chunk => { raw += chunk; });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  try {
    body = await parseBody(req);
  } catch (e) {
    return res.status(400).json({ error: "Invalid request body: " + e.message });
  }

  const { to, subject, html, text, secret } = body;

  // Log what we received for debugging
  console.log(`[VERCEL SMTP] Request received. to=${to}, subject=${subject}, secret_present=${!!secret}`);

  // Verify secret key
  const expectedSecret = process.env.EMAIL_PROXY_SECRET || "jobsarthi_secure_proxy_secret_123";
  if (secret !== expectedSecret) {
    console.error(`[VERCEL SMTP] Unauthorized: received secret="${secret}", expected="${expectedSecret}"`);
    return res.status(401).json({ error: "Unauthorized proxy request" });
  }

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: "Missing required fields: to, subject, and html or text" });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("[VERCEL SMTP] SMTP_USER or SMTP_PASS environment variables are not set in Vercel!");
    return res.status(500).json({ error: "SMTP credentials not configured on Vercel. Add SMTP_USER and SMTP_PASS to Vercel Environment Variables." });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      lookup: (hostname, options, callback) => {
        dns.lookup(hostname, Object.assign({}, options, { family: 4 }), callback);
      }
    });

    const mailOptions = {
      from: `"JobSarthi" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || "",
      html: html || ""
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[VERCEL SMTP] Email sent to ${to}: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error(`[VERCEL SMTP] Failed to send to ${to}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
