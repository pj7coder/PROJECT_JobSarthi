export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  // Set the environment flag BEFORE importing/executing server.js
  process.env.NEXT_JS = "true";
  
  // Dynamically import the Express app to ensure it reads the env var correctly
  const { app } = await import("../../server.js");
  
  // Hand off request and response
  return app(req, res);
}
