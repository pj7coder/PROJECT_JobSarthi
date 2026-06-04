export default async function handler(req, res) {
  console.log("Cron-collect trigger received. Contacting Render backend to run job aggregation...");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for safety

    const url = 'https://project-jobsarthi.onrender.com/api/admin/jobs/collect';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Render responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log("Render response:", data);
    res.status(200).json({
      success: true,
      message: "Render aggregation completed.",
      data
    });
  } catch (err) {
    console.error("Cron-collect failed:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to trigger Render collector."
    });
  }
}
