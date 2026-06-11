import nodemailer from "nodemailer";
import dns from "dns";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, subject, html, text, secret } = req.body;

  // Verify secret key for secure communication between Render and Vercel
  const expectedSecret = process.env.EMAIL_PROXY_SECRET || "jobsarthi_secure_proxy_secret_123";
  if (secret !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized proxy request" });
  }

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: "Missing required fields (to, subject, and either html or text)" });
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
      from: `"JobSarthi" <${process.env.SMTP_USER || 'support@jobsarthi.ai'}>`,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[VERCEL SMTP PROXY] Sent email to ${to}: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error(`[VERCEL SMTP PROXY ERROR] Failed to send email to ${to}:`, error.message);
    return res.status(500).json({ error: `Nodemailer failed: ${error.message}` });
  }
}
