// Shared Header and About Panel HTML templates for JobSarthi
// Stored as JavaScript variables to prevent CORS blocks when opening pages via file:/// protocol directly.

window.aboutContentHTML = `
<div class="about-grid">
  <div class="about-hero">
    <h2>Empowering Careers through Intelligent Matchmaking</h2>
    <p>JobSarthi is an advanced AI-powered career companion and recruitment ecosystem designed to make hiring
      and job seeking transparent, efficient, and skill-driven.</p>
  </div>

  <div class="about-columns">
    <div class="about-col">
      <h3>For Job Seekers</h3>
      <ul>
        <li>Interactive career guidance with Sarthi AI</li>
        <li>Verified skill assessments and credentials</li>
        <li>Smart resume optimization tools</li>
      </ul>
    </div>
    <div class="about-col">
      <h3>For Recruiters</h3>
      <ul>
        <li>Access to a pre-screened, verified talent pool</li>
        <li>Data-driven candidate match scoring</li>
        <li>Streamlined recruitment pipelines</li>
      </ul>
    </div>
  </div>

  <div class="about-footer">
    <p>Crafted for the future of recruitment.</p>
    <div class="team-credit">Developed by Team <span class="highlight">MATRIX MINDS</span></div>
  </div>
</div>
`;

window.headerLandingHTML = `
<header class="header" id="mainHeader">
  <div class="header-main-row">
    <div style="display: flex; align-items: center; gap: 14px;">
      <a href="#" class="logo" id="logoLink"
        style="display: flex; align-items: center; gap: 10px; cursor: pointer; text-decoration: none; color: inherit;">
        <img src="[PREFIX]assets/jobsarthilogo.png" alt="JobSarthi Logo" class="logo-img">
        <span>JobSarthi</span>
      </a>
    </div>
    <nav>
      <ul class="nav-links">
        <li><a href="#hero" class="nav-link active">Home</a></li>
        <li><a href="#portal" class="nav-link">Portals</a></li>
        <li><a href="#reviews" class="nav-link">Reviews</a></li>
        <li><a href="#sarthi-scroll-section" class="nav-link">Sarthi AI</a></li>
      </ul>
    </nav>
    <div class="header-actions">
      <!-- Finder Tab (Blue) -->
      <a href="seeker/login_signup.html" class="btn btn-glow"
        style="padding: 8px 16px; font-size: 0.85rem; background: linear-gradient(135deg, #1d4ed8, #3b82f6); border: none; color: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); border-radius: var(--radius-full); font-weight: 600;">Finder</a>
      <!-- Recruiter Tab (Magenta) -->
      <a href="recruiter/login_signup.html" class="btn btn-glow"
        style="padding: 8px 16px; font-size: 0.85rem; background: linear-gradient(135deg, #a21caf, #d946ef); border: none; color: #fff; box-shadow: 0 4px 12px rgba(217, 70, 239, 0.3); border-radius: var(--radius-full); font-weight: 600;">Recruiter</a>

      <!-- Settings Dropdown Trigger -->
      <div class="header-dropdown-container">
        <button class="btn-icon dropdown-trigger" aria-label="Settings" style="background: transparent; border: none; color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 50%; transition: background 0.2s;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <!-- Settings Dropdown Menu -->
        <div class="header-dropdown-menu settings-dropdown" style="min-width: 250px; padding: 16px; top: calc(100% + 12px); right: 0;">
          <div class="dropdown-header" style="padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle); margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-main);">Settings</h4>
          </div>
          <div class="dropdown-body">
            <div class="setting-option" style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div class="setting-info" style="text-align: left;">
                <span class="setting-title" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-main);">Light Mode Theme</span>
                <span class="setting-desc" style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Switch between dark and light themes</span>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" id="themeToggleCheckbox" onclick="toggleTheme()">
                <span class="slider-round"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
    <button id="closeAboutBtn" aria-label="Close About Panel">✕</button>
  </div>

  <!-- Integrated About Content -->
  <div class="about-content" id="aboutContent"></div>
</header>
`;

window.headerSeekerHTML = `
<header class="header" id="mainHeader">
  <div class="header-main-row">
    <div style="display: flex; align-items: center; gap: 14px;">
      <a href="#" class="logo" id="logoLink"
        style="display: flex; align-items: center; gap: 10px; cursor: pointer; text-decoration: none; color: inherit;">
        <img src="[PREFIX]assets/jobsarthilogo.png" alt="JobSarthi Logo" class="logo-img">
        <span>JobSarthi</span>
      </a>
    </div>
    <nav>
      <ul class="nav-links">
        <li><a href="index.html" class="nav-link">Dashboard</a></li>
        <li><a href="resume.html" class="nav-link">Resume</a></li>
        <li><a href="jobs.html" class="nav-link">Jobs</a></li>
        <li><a href="analytics.html" class="nav-link">Analytics</a></li>
        <li><a href="messages.html" class="nav-link">Messages</a></li>
      </ul>
    </nav>
    <div class="header-actions">
      <!-- Notification Trigger -->
      <div class="header-dropdown-container">
        <button class="btn-icon dropdown-trigger" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span class="notification-dot active"></span>
        </button>
        <!-- Notification Dropdown -->
        <div class="header-dropdown-menu notif-dropdown">
          <div class="dropdown-header">
            <h4>Notifications</h4>
            <button class="mark-all-read-btn">Mark all as read</button>
          </div>
          <div class="dropdown-body">
            <div class="notif-item unread">
              <div class="notif-bullet"></div>
              <div class="notif-content">
                <div class="notif-title">New Job Match Found</div>
                <div class="notif-desc">A new React developer role matches your skills.</div>
                <div class="notif-time">2 mins ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Trigger -->
      <div class="header-dropdown-container">
        <button class="btn-icon dropdown-trigger" aria-label="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <!-- Settings Dropdown -->
        <div class="header-dropdown-menu settings-dropdown">
          <div class="dropdown-header">
            <h4>Settings</h4>
          </div>
          <div class="dropdown-body">
            <div class="setting-option">
              <div class="setting-info">
                <span class="setting-title">Light Mode Theme</span>
                <span class="setting-desc">Switch between dark and light themes</span>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" id="themeToggleCheckbox" onclick="toggleTheme()">
                <span class="slider-round"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Trigger -->
      <div class="header-dropdown-container">
        <div class="profile-badge dropdown-trigger">
          <div class="profile-img" id="headerProfileInitials">C</div>
        </div>
        <!-- Profile Dropdown -->
        <div class="header-dropdown-menu profile-dropdown">
          <div class="dropdown-header profile-dropdown-header">
            <div class="profile-avatar-circle" id="popupProfileInitials">C</div>
            <div class="profile-info-block">
              <h4 id="popupProfileName">Candidate</h4>
              <p id="popupProfileEmail">candidate@jobsarthi.ai</p>
            </div>
          </div>
          <div class="dropdown-body" style="padding: 10px; display: flex; flex-direction: column; gap: 4px;">
            <a class="dropdown-action-item" href="resume.html" style="text-decoration: none; display: flex; align-items: center; gap: 8px; color: var(--text-main); font-size: 0.88rem; padding: 10px 12px; transition: background 0.2s; border-radius: 6px; width: 100%; box-sizing: border-box; background: transparent; border: none; cursor: pointer; text-align: left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
              Update Profile
            </a>
            <button class="dropdown-action-item" onclick="alert('Change Password feature is currently under development!')" style="display: flex; align-items: center; gap: 8px; color: var(--text-main); font-size: 0.88rem; padding: 10px 12px; transition: background 0.2s; border-radius: 6px; width: 100%; box-sizing: border-box; background: transparent; border: none; cursor: pointer; text-align: left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Change Password
            </button>
            <div style="border-top: 1px solid var(--border-subtle); margin: 6px 0;"></div>
            <button class="dropdown-action-item logout-btn" onclick="logout()" style="display: flex; align-items: center; gap: 8px; color: var(--danger); font-size: 0.88rem; padding: 10px 12px; transition: background 0.2s; border-radius: 6px; width: 100%; box-sizing: border-box; background: transparent; border: none; cursor: pointer; text-align: left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
    <button id="closeAboutBtn" aria-label="Close About Panel">✕</button>
  </div>

  <!-- Integrated About Content -->
  <div class="about-content" id="aboutContent"></div>
</header>
`;

window.headerRecruiterHTML = `
<header class="header" id="mainHeader">
  <div class="header-main-row">
    <div style="display: flex; align-items: center; gap: 14px;">
      <a href="#" class="logo" id="logoLink"
        style="display: flex; align-items: center; gap: 10px; cursor: pointer; text-decoration: none; color: inherit;">
        <img src="[PREFIX]assets/jobsarthilogo.png" alt="JobSarthi Logo" class="logo-img">
        <span>JobSarthi</span>
      </a>
    </div>
    <nav>
      <ul class="nav-links">
        <li><a href="index.html" class="nav-link">Dashboard</a></li>
        <li><a href="create_job.html" class="nav-link">Create Job</a></li>
        <li><a href="applicants.html" class="nav-link">Applicants</a></li>
        <li><a href="analytics.html" class="nav-link">Analytics</a></li>
        <li><a href="messages.html" class="nav-link">Messages</a></li>
      </ul>
    </nav>
    <div class="header-actions">
      <!-- Notification Trigger -->
      <div class="header-dropdown-container">
        <button class="btn-icon dropdown-trigger" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span class="notification-dot active"></span>
        </button>
        <!-- Notification Dropdown -->
        <div class="header-dropdown-menu notif-dropdown">
          <div class="dropdown-header">
            <h4>Notifications</h4>
            <button class="mark-all-read-btn">Mark all as read</button>
          </div>
          <div class="dropdown-body">
            <div class="notif-item unread">
              <div class="notif-bullet"></div>
              <div class="notif-content">
                <div class="notif-title">New Application Received</div>
                <div class="notif-desc">A qualified candidate applied for React Developer role.</div>
                <div class="notif-time">5 mins ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Trigger -->
      <div class="header-dropdown-container">
        <button class="btn-icon dropdown-trigger" aria-label="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <!-- Settings Dropdown -->
        <div class="header-dropdown-menu settings-dropdown">
          <div class="dropdown-header">
            <h4>Settings</h4>
          </div>
          <div class="dropdown-body">
            <div class="setting-option">
              <div class="setting-info">
                <span class="setting-title">Light Mode Theme</span>
                <span class="setting-desc">Switch between dark and light themes</span>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" id="themeToggleCheckbox" onclick="toggleTheme()">
                <span class="slider-round"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Trigger -->
      <div class="header-dropdown-container">
        <div class="profile-badge dropdown-trigger">
          <div class="profile-img" id="headerProfileInitials">R</div>
        </div>
        <!-- Profile Dropdown -->
        <div class="header-dropdown-menu profile-dropdown">
          <div class="dropdown-header profile-dropdown-header">
            <div class="profile-avatar-circle" id="popupProfileInitials">R</div>
            <div class="profile-info-block">
              <h4 id="popupProfileName">Recruiter</h4>
              <p id="popupProfileEmail">recruiter@jobsarthi.ai</p>
            </div>
          </div>
          <div class="dropdown-body" style="padding: 10px; display: flex; flex-direction: column; gap: 4px;">
            <button class="dropdown-action-item" onclick="alert('Recruiter profile settings are under development!')" style="display: flex; align-items: center; gap: 8px; color: var(--text-main); font-size: 0.88rem; padding: 10px 12px; transition: background 0.2s; border-radius: 6px; width: 100%; box-sizing: border-box; background: transparent; border: none; cursor: pointer; text-align: left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
              Update Profile
            </button>
            <button class="dropdown-action-item" onclick="alert('Change Password feature is currently under development!')" style="display: flex; align-items: center; gap: 8px; color: var(--text-main); font-size: 0.88rem; padding: 10px 12px; transition: background 0.2s; border-radius: 6px; width: 100%; box-sizing: border-box; background: transparent; border: none; cursor: pointer; text-align: left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Change Password
            </button>
            <div style="border-top: 1px solid var(--border-subtle); margin: 6px 0;"></div>
            <button class="dropdown-action-item logout-btn" onclick="logout()" style="display: flex; align-items: center; gap: 8px; color: var(--danger); font-size: 0.88rem; padding: 10px 12px; transition: background 0.2s; border-radius: 6px; width: 100%; box-sizing: border-box; background: transparent; border: none; cursor: pointer; text-align: left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
    <button id="closeAboutBtn" aria-label="Close About Panel">✕</button>
  </div>

  <!-- Integrated About Content -->
  <div class="about-content" id="aboutContent"></div>
</header>
`;
