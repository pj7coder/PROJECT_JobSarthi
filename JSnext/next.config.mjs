/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Landing page
      { source: "/", destination: "/index.html" },
      { source: "/change_password", destination: "/change_password.html" },

      // Seeker routes
      { source: "/seeker", destination: "/seeker/index.html" },
      { source: "/seeker/login_signup", destination: "/seeker/login_signup.html" },
      { source: "/seeker/jobs", destination: "/seeker/jobs.html" },
      { source: "/seeker/messages", destination: "/seeker/messages.html" },
      { source: "/seeker/aiinterview", destination: "/seeker/aiinterview.html" },
      { source: "/seeker/resume", destination: "/seeker/resume.html" },
      { source: "/seeker/resumeanalyser", destination: "/seeker/resumeanalyser.html" },
      { source: "/seeker/analytics", destination: "/seeker/analytics.html" },

      // Recruiter routes
      { source: "/recruiter", destination: "/recruiter/index.html" },
      { source: "/recruiter/login_signup", destination: "/recruiter/login_signup.html" },
      { source: "/recruiter/ai_interview", destination: "/recruiter/ai_interview.html" },
      { source: "/recruiter/analytics", destination: "/recruiter/analytics.html" },
      { source: "/recruiter/applicants", destination: "/recruiter/applicants.html" },
      { source: "/recruiter/create_job", destination: "/recruiter/create_job.html" },
      { source: "/recruiter/messages", destination: "/recruiter/messages.html" },
    ];
  }
};

export default nextConfig;
