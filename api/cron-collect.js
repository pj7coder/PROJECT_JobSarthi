import { syncNextCompany } from "../jobCollector.js";

export default async function handler(req, res) {
  console.log("[Vercel Serverless Cron] Starting job collection pipeline run directly on Vercel...");
  try {
    // Run the round-robin synchronization of the next company
    const stats = await syncNextCompany();
    
    console.log("[Vercel Serverless Cron] Sync complete. Stats:", stats);
    res.status(200).json({
      success: true,
      message: "Job collection completed natively on Vercel Serverless.",
      stats
    });
  } catch (err) {
    console.error("[Vercel Serverless Cron] Job collection failed:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Job collection pipeline failed on Vercel."
    });
  }
}
