import { app } from "../../server.js";

// Disable Next.js body parsing so Express body parsers can read the stream
export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  // Pass the request to the Express application
  return app(req, res);
}
