// JobSarthi Shared Header Script
// Dynamically loads the templates from commonelements/headers.js to bypass CORS issues on local filesystem.

// Dynamic API Base URL configuration (Vercel/file:// compatibility)
(function() {
  const getApiBaseUrl = () => {
    // Check if we are running locally opening file:// protocol
    if (window.location.protocol === 'file:') {
      return 'http://localhost:3000';
    }
    // Check if we are running on Vercel or other cloud hosted frontend
    if (window.location.hostname.includes('vercel') || window.location.hostname.includes('github.io')) {
      return 'https://project-jobsarthi.onrender.com';
    }
    return '';
  };
  window.API_BASE_URL = getApiBaseUrl();

  // Background ping to wake up Render instance from cold-start sleep
  if (window.API_BASE_URL) {
    console.log("[JobSarthi] Pinging Render backend to wake it up...");
    fetch(window.API_BASE_URL + '/api/ping')
      .then(res => res.json())
      .then(data => console.log("[JobSarthi] Backend status: awake", data))
      .catch(err => console.warn("[JobSarthi] Wake-up ping failed:", err));
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const isRecruiter = window.location.pathname.includes('/recruiter/');
  const isSeeker = window.location.pathname.includes('/seeker/');

  let prefix = './';
  let headerVarName = 'headerLandingHTML';

  if (isRecruiter) {
    prefix = '../';
    headerVarName = 'headerRecruiterHTML';
    document.body.classList.add('recruiter-page');
  } else if (isSeeker) {
    prefix = '../';
    headerVarName = 'headerSeekerHTML';
    document.body.classList.add('seeker-page');
  }

  // Apply saved accent color immediately to prevent flash of default color
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light' || savedTheme === 'dark') {
    const savedAccent = localStorage.getItem('accent_color');
    if (savedAccent) {
      try {
        const accentData = JSON.parse(savedAccent);
        document.body.style.setProperty('--accent-secondary', accentData.secondary);
        document.body.style.setProperty('--accent-tertiary', accentData.tertiary);
        document.body.style.setProperty('--border-focus', accentData.focus);
        document.body.style.setProperty('--accent-secondary-hover', accentData.hover);
      } catch (e) {
        console.error("Error parsing accent color:", e);
      }
    } else {
      if (!isRecruiter && !isSeeker) {
        document.body.style.setProperty('--accent-secondary', '#2563eb');
        document.body.style.setProperty('--accent-tertiary', '#3b82f6');
        document.body.style.setProperty('--border-focus', 'rgba(59, 130, 246, 0.4)');
        document.body.style.setProperty('--accent-secondary-hover', '#1d4ed8');
      }
    }
  }

  const headerWrapper = document.querySelector('.header-wrapper');
  if (!headerWrapper) return;

  function initializeHeader() {
    try {
      // 1. Get header template and replace [PREFIX] path tokens
      let headerTemplate = window[headerVarName];
      if (!headerTemplate) {
        throw new Error(`Template variable ${headerVarName} is not defined.`);
      }
      headerTemplate = headerTemplate.replaceAll('[PREFIX]', prefix);

      // Inject template
      headerWrapper.innerHTML = headerTemplate;

      // 2. Inject shared About panel content
      const aboutContentContainer = document.getElementById('aboutContent');
      if (aboutContentContainer && window.aboutContentHTML) {
        aboutContentContainer.innerHTML = window.aboutContentHTML.replaceAll('[PREFIX]', prefix);
      }

      // 3. Initialize theme state
      let savedTheme = localStorage.getItem('theme') || 'dark';
      if (savedTheme === 'pastel-light') {
        savedTheme = 'light';
        localStorage.setItem('theme', 'light');
      } else if (savedTheme === 'pastel-dark') {
        savedTheme = 'dark';
        localStorage.setItem('theme', 'dark');
      }
      document.documentElement.classList.remove('light-theme', 'pastel-light-theme', 'pastel-dark-theme');
      document.body.classList.remove('light-theme', 'pastel-light-theme', 'pastel-dark-theme');
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
      }
      const checkbox = document.getElementById('themeToggleCheckbox');
      if (checkbox) checkbox.checked = (savedTheme === 'light');

      // 3a. Initialize accent color state
      const savedAccent = localStorage.getItem('accent_color');
      if (savedAccent) {
        try {
          const accentData = JSON.parse(savedAccent);
          document.body.style.setProperty('--accent-secondary', accentData.secondary);
          document.body.style.setProperty('--accent-tertiary', accentData.tertiary);
          document.body.style.setProperty('--border-focus', accentData.focus);
          document.body.style.setProperty('--accent-secondary-hover', accentData.hover);
        } catch (e) {
          console.error("Error parsing accent color:", e);
        }
      } else {
        if (!isRecruiter && !isSeeker) {
          document.body.style.setProperty('--accent-secondary', '#2563eb');
          document.body.style.setProperty('--accent-tertiary', '#3b82f6');
          document.body.style.setProperty('--border-focus', 'rgba(59, 130, 246, 0.4)');
          document.body.style.setProperty('--accent-secondary-hover', '#1d4ed8');
        }
      }

      // 3b. Initialize splash cursor settings state
      const splashEnabled = localStorage.getItem('splash_cursor_enabled') === 'true';
      const splashCheckboxes = document.querySelectorAll('#splashCursorToggleCheckbox');
      splashCheckboxes.forEach(cb => {
        cb.checked = splashEnabled;
      });

      const splashDensitySliderVal = parseFloat(localStorage.getItem('splash_cursor_density_slider') || '7');
      const splashSliders = document.querySelectorAll('#splashDensitySlider');
      splashSliders.forEach(slider => {
        slider.value = splashDensitySliderVal;
      });

      const splashValLabels = document.querySelectorAll('#splashDensityVal');
      splashValLabels.forEach(label => {
        label.textContent = splashDensitySliderVal.toFixed(0);
      });

      const densityOptions = document.querySelectorAll('#splashDensityOption');
      densityOptions.forEach(opt => {
        opt.style.display = splashEnabled ? 'flex' : 'none';
      });

      // Inject SplashCursor script dynamically if it hasn't been loaded already
      if (!document.getElementById('splashCursorScript')) {
        const splashScript = document.createElement('script');
        splashScript.id = 'splashCursorScript';
        splashScript.src = prefix + 'js/SplashCursor.js';
        document.body.appendChild(splashScript);
      }

      // 4. Identify role and check authentication
      const isLanding = !isRecruiter && !isSeeker;
      const isJobsPage = window.location.pathname.includes('jobs.html');
      const isAuthPage = window.location.pathname.includes('login_signup.html');
      const authKey = isRecruiter ? 'recruiter_logged_in' : 'seeker_logged_in';
      const isLoggedIn = localStorage.getItem(authKey) === 'true';

      if (!isLanding && !isJobsPage && !isAuthPage) {
        if (!isLoggedIn) {
          window.location.href = 'login_signup.html';
          return;
        }
      }

      // 5. Setup User Profile Name & Initials
      const userName = isLoggedIn
        ? (isRecruiter ? (localStorage.getItem('recruiter_company') || 'Employer') : (localStorage.getItem('seeker_name') || 'Candidate'))
        : 'Guest';
      const userEmail = isLoggedIn
        ? (isRecruiter ? (localStorage.getItem('recruiter_email') || 'hr@jobsarthi.ai') : (localStorage.getItem('seeker_email') || 'user@jobsarthi.ai'))
        : 'Sign in to sync profile';

      const initial = isLoggedIn ? userName.charAt(0).toUpperCase() : 'G';

      // Populate header profile
      const headerInitials = document.getElementById('headerProfileInitials');
      const headerName = document.getElementById('headerProfileName');
      if (headerInitials) headerInitials.textContent = initial;
      if (headerName) headerName.textContent = userName;

      // Populate popup profile
      const popupInitials = document.getElementById('popupProfileInitials');
      const popupName = document.getElementById('popupProfileName');
      const popupEmail = document.getElementById('popupProfileEmail');
      if (popupInitials) popupInitials.textContent = initial;
      if (popupName) popupName.textContent = userName;
      if (popupEmail) popupEmail.textContent = userEmail;

      // Populate any page sidebar items if they exist
      const sidebarAvatar = document.getElementById('sidebarAvatar');
      const sidebarName = document.getElementById('sidebarName');
      const welcomeName = document.getElementById('welcomeName');
      if (sidebarAvatar) sidebarAvatar.textContent = initial;
      if (sidebarName) sidebarName.textContent = userName;
      if (welcomeName) welcomeName.textContent = userName ? userName.split(' ')[0] : 'Candidate';

      // Customize logout button if not logged in
      if (!isLoggedIn) {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
          logoutBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            Sign In
          `;
          logoutBtn.setAttribute('onclick', "window.location.href='login_signup.html'");
          logoutBtn.className = 'dropdown-action-item login-btn';
        }
      }

      // Function to render avatar image over initials
      function updateAvatarUI(avatarUrl) {
        if (!avatarUrl) return;
        const imgHtml = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
        if (headerInitials) {
          headerInitials.innerHTML = imgHtml;
          headerInitials.style.background = 'transparent';
        }
        if (popupInitials) {
          popupInitials.innerHTML = imgHtml;
          popupInitials.style.background = 'transparent';
        }
        if (sidebarAvatar) {
          sidebarAvatar.innerHTML = imgHtml;
          sidebarAvatar.style.background = 'transparent';
        }
      }

      // Fast load avatar from localStorage, and fetch API to keep it fresh
      if (isSeeker) {
        const storedAvatar = localStorage.getItem('seeker_avatar_url');
        if (storedAvatar) {
          updateAvatarUI(storedAvatar);
        }
        // Async update
        const profileUrl = window.API_BASE_URL
          ? `${window.API_BASE_URL}/api/seeker/profile?email=${encodeURIComponent(userEmail)}`
          : `${prefix}api/seeker/profile?email=${encodeURIComponent(userEmail)}`;
        fetch(profileUrl)
          .then(res => res.json())
          .then(profile => {
            if (profile && profile.avatarUrl) {
              localStorage.setItem('seeker_avatar_url', profile.avatarUrl);
              updateAvatarUI(profile.avatarUrl);
            } else {
              localStorage.removeItem('seeker_avatar_url');
            }
          })
          .catch(err => console.error("Error fetching avatar:", err));
      }

      // 6. Dropdown & Settings Modal Interactions
      const settingsBtn = headerWrapper.querySelector('[aria-label="Settings"]');
      if (settingsBtn) {
        settingsBtn.classList.remove('dropdown-trigger');
        const localSettingsDropdown = settingsBtn.parentElement.querySelector('.settings-dropdown');
        if (localSettingsDropdown) {
          localSettingsDropdown.remove();
        }
        
        settingsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (!document.getElementById('globalSettingsModal')) {
            const modalHTML = `
              <div class="settings-modal-overlay" id="globalSettingsModal">
                <div class="settings-modal-card">
                  <div class="settings-modal-left">
                    <h3 class="settings-modal-title">Settings</h3>
                    <div class="liquid-group-vertical" id="settingsLiquidTabs">
                      <input type="radio" id="tabRadio-themes" name="settingsTab" checked style="display:none;">
                      <label for="tabRadio-themes" class="settings-tab-label active" data-tab="themes" data-index="0">
                        <svg class="settings-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.759 1.119 5.259 2.929 7.071l.007.007c.391.391 1.024.391 1.414 0 .391-.391.391-1.024 0-1.414A7.962 7.962 0 0 1 4 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8a7.963 7.963 0 0 1-5.186-1.929l-.007-.007a1 1 0 0 0-1.414 1.414A9.96 9.96 0 0 0 12 22z"></path><circle cx="7.5" cy="10.5" r="1.5"></circle><circle cx="11.5" cy="7.5" r="1.5"></circle><circle cx="16.5" cy="9.5" r="1.5"></circle><circle cx="15.5" cy="14.5" r="1.5"></circle></svg>
                        Themes
                      </label>
                      
                      <input type="radio" id="tabRadio-ui-ux" name="settingsTab" style="display:none;">
                      <label for="tabRadio-ui-ux" class="settings-tab-label" data-tab="ui-ux" data-index="1">
                        <svg class="settings-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="2" y1="14" x2="6" y2="14"></line><line x1="10" y1="8" x2="14" y2="8"></line><line x1="18" y1="16" x2="22" y2="16"></line></svg>
                        UI/UX
                      </label>
                      
                      <input type="radio" id="tabRadio-languages" name="settingsTab" style="display:none;">
                      <label for="tabRadio-languages" class="settings-tab-label" data-tab="languages" data-index="2">
                        <svg class="settings-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        Languages
                      </label>
                      
                      <input type="radio" id="tabRadio-account" name="settingsTab" style="display:none;">
                      <label for="tabRadio-account" class="settings-tab-label" data-tab="account" data-index="3">
                        <svg class="settings-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Account
                      </label>
                      
                      <input type="radio" id="tabRadio-notifications" name="settingsTab" style="display:none;">
                      <label for="tabRadio-notifications" class="settings-tab-label" data-tab="notifications" data-index="4">
                        <svg class="settings-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        Notifications
                      </label>
                      
                      <input type="radio" id="tabRadio-security" name="settingsTab" style="display:none;">
                      <label for="tabRadio-security" class="settings-tab-label" data-tab="security" data-index="5">
                        <svg class="settings-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Security
                      </label>
                      <div class="liquid-slider-vertical" id="liquidSliderIndicator"></div>
                    </div>
                    <button class="settings-modal-close-btn" id="closeSettingsModalBtn">Close Settings</button>
                  </div>
                  <div class="settings-modal-right">
                    <!-- Tab Content: Themes -->
                    <div class="settings-tab-content active" id="tab-themes">
                      <h4>System Themes</h4>
                      <p class="tab-desc">Select your preferred workspace theme appearance.</p>
                      
                      <div class="theme-cards-container">
                        <!-- Light Theme Card -->
                        <div class="theme-card" id="themeCardLight" data-theme="light">
                          <div class="theme-card-preview theme-preview-light">
                            <div class="preview-header"></div>
                            <div class="preview-body"></div>
                          </div>
                          <div class="theme-card-label">Light Theme</div>
                        </div>
                        <!-- Dark Theme Card -->
                        <div class="theme-card" id="themeCardDark" data-theme="dark">
                          <div class="theme-card-preview theme-preview-dark">
                            <div class="preview-header"></div>
                            <div class="preview-body"></div>
                          </div>
                          <div class="theme-card-label">Dark Theme</div>
                        </div>
                      </div>
                      
                      <!-- Color Accent Options Section -->
                      <div id="themeColorsSection" class="theme-colors-section" style="display: none;">
                        <span id="themeColorsSectionTitle" class="setting-item-title" style="font-weight: 600;">Accent Color</span>
                        <p class="setting-item-desc" style="margin: 0 0 8px 0; font-size: 0.82rem; color: var(--text-muted);">Personalize the workspace highlight color.</p>
                        <div class="container-items" id="themeColorsContainer">
                          <!-- Filled dynamically by JavaScript -->
                        </div>
                        
                        <!-- Randomize Button Colors Checkbox -->
                        <div id="randomColorsSection" style="margin-top: 16px; display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--border-subtle); padding-top: 12px;">
                          <div>
                            <span class="setting-item-title" style="font-weight: 600;">Disco Buttons</span>
                            <p class="setting-item-desc" style="margin: 0; font-size: 0.82rem; color: var(--text-muted);">Randomize button colors statically (except delete/like buttons).</p>
                          </div>
                          <label class="switch-toggle">
                            <input type="checkbox" id="modalRandomColorsToggle">
                            <span class="slider-round"></span>
                          </label>
                        </div>
                      </div>

                    </div>

                    <!-- Tab Content: UI/UX -->
                    <div class="settings-tab-content" id="tab-ui-ux" style="display: none;">
                      <h4>UI/UX Preferences</h4>
                      <p class="tab-desc">Customise the look and feel of your JobSarthi dashboard.</p>
                      
                      <div class="setting-item">
                        <div class="setting-item-info">
                          <span class="setting-item-title" style="font-weight: 600;">Advanced UI Effects</span>
                          <span class="setting-item-desc">Master switch to toggle premium animated UI enhancements</span>
                        </div>
                        <label class="switch-toggle">
                          <input type="checkbox" id="modalAdvancedUIToggle">
                          <span class="slider-round"></span>
                        </label>
                      </div>

                      <div id="advancedUIOptionsContainer" style="display: flex; flex-direction: column; gap: 14px; margin-top: 14px; transition: all 0.3s ease;">
                        
                        <div class="setting-item" style="padding-left: 12px; border-left: 2px solid rgba(255,255,255,0.05);">
                          <div class="setting-item-info">
                            <span class="setting-item-title">Splash Cursor</span>
                            <span class="setting-item-desc">Toggle interactive liquid cursor effects</span>
                          </div>
                          <label class="switch-toggle">
                            <input type="checkbox" id="modalCursorToggle">
                            <span class="slider-round"></span>
                          </label>
                        </div>

                        <div class="setting-item" id="splashDensityOption" style="flex-direction: column; align-items: stretch; gap: 8px; padding-left: 12px; border-left: 2px solid rgba(255,255,255,0.05);">
                          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div class="setting-item-info">
                              <span class="setting-item-title">Cursor Trail Density</span>
                              <span class="setting-item-desc">Adjust fluid trail thickness</span>
                            </div>
                            <span id="modalSplashDensityVal" style="font-weight: 700;">7</span>
                          </div>
                          <input type="range" min="1" max="10" step="1" value="7" style="width: 100%; cursor: pointer;" id="modalSplashDensitySlider">
                        </div>

                        <div class="setting-item" style="padding-left: 12px; border-left: 2px solid rgba(255,255,255,0.05);">
                          <div class="setting-item-info">
                            <span class="setting-item-title">Dynamic Header</span>
                            <span class="setting-item-desc">Enable logo click vertical expansion & physics</span>
                          </div>
                          <label class="switch-toggle">
                            <input type="checkbox" id="modalHeaderToggle">
                            <span class="slider-round"></span>
                          </label>
                        </div>

                        <div class="setting-item" style="padding-left: 12px; border-left: 2px solid rgba(255,255,255,0.05); align-items: center; justify-content: space-between;">
                          <div class="setting-item-info">
                            <span class="setting-item-title">Header Navigation Style</span>
                            <span class="setting-item-desc">Display navigation links as text or icons</span>
                          </div>
                          <div class="custom-select-container" id="modalNavigationStyleSelect">
                            <button class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false" type="button">
                              <span class="custom-select-label">Text Only</span>
                              <svg class="custom-select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>
                            <ul class="custom-select-options" role="listbox">
                              <li class="custom-select-option" data-value="text" role="option">Text Only</li>
                              <li class="custom-select-option" data-value="icon" role="option">Icons Only</li>
                              <li class="custom-select-option" data-value="both" role="option">Both (Icon + Text)</li>
                            </ul>
                          </div>
                        </div>

                        <div class="setting-item" style="padding-left: 12px; border-left: 2px solid rgba(255,255,255,0.05); align-items: center; justify-content: space-between;">
                          <div class="setting-item-info">
                            <span class="setting-item-title">Falling Text Effect</span>
                            <span class="setting-item-desc">Enable text physics inside about panel on cursor shake</span>
                          </div>
                          <label class="switch-toggle">
                            <input type="checkbox" id="modalFallingTextToggle">
                            <span class="slider-round"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Tab Content: Languages -->
                    <div class="settings-tab-content" id="tab-languages" style="display: none;">
                      <h4>Language Settings</h4>
                      <p class="tab-desc">Select your preferred system language.</p>
                      <div class="setting-item">
                        <div class="setting-item-info">
                          <span class="setting-item-title">Preferred Language</span>
                          <span class="setting-item-desc">Choose language for interface text</span>
                        </div>
                        <select class="setting-select" id="modalLanguageSelect">
                          <option value="en">English (US)</option>
                          <option value="en-gb">English (UK)</option>
                          <option value="hi">हिन्दी (Hindi)</option>
                          <option value="es">Español (Spanish)</option>
                          <option value="fr">Français (French)</option>
                        </select>
                      </div>
                    </div>
                    
                    <!-- Tab Content: Account -->
                    <div class="settings-tab-content" id="tab-account" style="display: none;">
                      <h4>Account & Profile</h4>
                      <p class="tab-desc">Manage your account details and portal preferences.</p>
                      <div class="setting-item">
                        <div class="setting-item-info">
                          <span class="setting-item-title">Account Type</span>
                          <span class="setting-item-desc">View your registered portal role</span>
                        </div>
                        <span class="setting-badge" id="modalAccountType">Candidate</span>
                      </div>
                      <div class="setting-item">
                        <div class="setting-item-info">
                          <span class="setting-item-title">Data Backup</span>
                          <span class="setting-item-desc">Export your profile data to JSON format</span>
                        </div>
                        <button class="btn-simple-settings" onclick="alert('Profile data backup started!')">Export Data</button>
                      </div>
                    </div>
                    
                    <!-- Tab Content: Notifications -->
                    <div class="settings-tab-content" id="tab-notifications" style="display: none;">
                      <h4>Notification Hub</h4>
                      <p class="tab-desc">Configure how and when you receive notifications.</p>
                      <div class="setting-item">
                        <div class="setting-item-info">
                          <span class="setting-item-title">Email Alerts</span>
                          <span class="setting-item-desc">Receive weekly job matches in inbox</span>
                        </div>
                        <label class="switch-toggle">
                          <input type="checkbox" checked>
                          <span class="slider-round"></span>
                        </label>
                      </div>
                      <div class="setting-item">
                        <div class="setting-item-info">
                          <span class="setting-item-title">Sarthi AI Voice Feedback</span>
                          <span class="setting-item-desc">Audio callouts during mock simulator</span>
                        </div>
                        <label class="switch-toggle">
                          <input type="checkbox" checked>
                          <span class="slider-round"></span>
                        </label>
                      </div>
                    </div>
                    
                    <!-- Tab Content: Security -->
                    <div class="settings-tab-content" id="tab-security" style="display: none;">
                      <h4>Security Settings</h4>
                      <p class="tab-desc">Manage authentication and password options.</p>
                      <div class="setting-item">
                        <div class="setting-item-info">
                          <span class="setting-item-title">Two-Factor Authentication</span>
                          <span class="setting-item-desc">Secure account login with MFA</span>
                        </div>
                        <label class="switch-toggle">
                          <input type="checkbox">
                          <span class="slider-round"></span>
                        </label>
                      </div>
                      <div class="setting-item">
                        <div class="setting-item-info">
                          <span class="setting-item-title">Session Manager</span>
                          <span class="setting-item-desc">Log out of all other devices</span>
                        </div>
                        <button class="btn-danger-settings" onclick="alert('Logged out of other devices successfully!')">Terminate Sessions</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
            const wrapperDiv = document.createElement('div');
            wrapperDiv.innerHTML = modalHTML.trim();
            const modalEl = wrapperDiv.firstChild;
            document.body.appendChild(modalEl);
            
            // Bind Modal Tab Actions
            const tabBtns = modalEl.querySelectorAll('.settings-tab-label');
            const tabContents = modalEl.querySelectorAll('.settings-tab-content');
            const sliderIndicator = modalEl.querySelector('#liquidSliderIndicator');
            
            tabBtns.forEach(btn => {
              btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                const index = parseInt(btn.getAttribute('data-index') || '0');
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => {
                  c.classList.remove('active');
                  c.style.display = 'none';
                });
                
                btn.classList.add('active');
                
                // Move slider indicator
                if (sliderIndicator) {
                  sliderIndicator.style.transform = `translateY(${index * 42}px)`;
                }
                
                const targetContent = modalEl.querySelector(`#tab-${tabId}`);
                if (targetContent) {
                  targetContent.classList.add('active');
                  targetContent.style.display = 'block';
                }
              });
            });
            
            // Close buttons
            const closeBtn = modalEl.querySelector('#closeSettingsModalBtn');
            const closeModal = () => {
              modalEl.classList.remove('active');
            };
            closeBtn.addEventListener('click', closeModal);
            modalEl.addEventListener('click', (e) => {
              if (e.target === modalEl) closeModal();
            });
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') closeModal();
            });

             // Helper to initialize custom select components
             const initCustomSelects = (parent) => {
               parent.querySelectorAll('.custom-select-container').forEach(container => {
                 const trigger = container.querySelector('.custom-select-trigger');
                 const label = container.querySelector('.custom-select-label');
                 const options = container.querySelectorAll('.custom-select-option');
                 
                 trigger.addEventListener('click', (e) => {
                   e.stopPropagation();
                   parent.querySelectorAll('.custom-select-container').forEach(other => {
                     if (other !== container) other.classList.remove('open');
                   });
                   if (!container.hasAttribute('disabled')) {
                     container.classList.toggle('open');
                   }
                 });
                 
                 options.forEach(opt => {
                   opt.addEventListener('click', (e) => {
                     e.stopPropagation();
                     const val = opt.getAttribute('data-value');
                     const text = opt.textContent;
                     options.forEach(o => o.classList.remove('selected'));
                     opt.classList.add('selected');
                     label.textContent = text;
                     container.classList.remove('open');
                     
                     // Dispatch change event
                     const changeEvent = new CustomEvent('change', { detail: { value: val } });
                     container.value = val;
                     container.dispatchEvent(changeEvent);
                   });
                 });
               });
               
               document.addEventListener('click', () => {
                 parent.querySelectorAll('.custom-select-container').forEach(container => {
                   container.classList.remove('open');
                 });
               });
             };

             // Helper to programmatically set value of a custom select
             const setCustomSelectValue = (container, value) => {
               if (!container) return;
               container.value = value;
               const options = container.querySelectorAll('.custom-select-option');
               const label = container.querySelector('.custom-select-label');
               options.forEach(opt => {
                 if (opt.getAttribute('data-value') === value) {
                   options.forEach(o => o.classList.remove('selected'));
                   opt.classList.add('selected');
                   if (label) label.textContent = opt.textContent;
                 }
               });
             };
             
             window.setCustomSelectValue = setCustomSelectValue;

             // Initialize custom selects inside modal template
             initCustomSelects(modalEl);

             // Helper to update sub-options visibility/state visually
             const updateAdvancedUIContainerState = (isEnabled) => {
               const advancedUIOptionsContainer = modalEl.querySelector('#advancedUIOptionsContainer');
               if (advancedUIOptionsContainer) {
                 if (isEnabled) {
                   advancedUIOptionsContainer.style.opacity = '1';
                   advancedUIOptionsContainer.style.pointerEvents = 'auto';
                   advancedUIOptionsContainer.querySelectorAll('input, select').forEach(el => {
                     el.removeAttribute('disabled');
                   });
                   advancedUIOptionsContainer.querySelectorAll('.custom-select-container').forEach(el => {
                     el.removeAttribute('disabled');
                     el.style.pointerEvents = 'auto';
                     el.style.opacity = '1';
                   });
                   // Sync falling text switch visibility based on dynamic header check state
                   const headerChecked = modalEl.querySelector('#modalHeaderToggle')?.checked;
                   const ftToggle = modalEl.querySelector('#modalFallingTextToggle');
                   if (ftToggle) {
                     if (headerChecked) {
                       ftToggle.removeAttribute('disabled');
                       ftToggle.parentElement.parentElement.style.opacity = '1';
                     } else {
                       ftToggle.setAttribute('disabled', 'true');
                       ftToggle.parentElement.parentElement.style.opacity = '0.4';
                     }
                   }
                 } else {
                   advancedUIOptionsContainer.style.opacity = '0.4';
                   advancedUIOptionsContainer.style.pointerEvents = 'none';
                   advancedUIOptionsContainer.querySelectorAll('input, select').forEach(el => {
                     el.setAttribute('disabled', 'true');
                   });
                   advancedUIOptionsContainer.querySelectorAll('.custom-select-container').forEach(el => {
                     el.setAttribute('disabled', 'true');
                     el.style.pointerEvents = 'none';
                     el.style.opacity = '0.4';
                   });
                 }
               }
             };
              // Bind card theme selection triggers
              const themeCards = modalEl.querySelectorAll('.theme-card');
              themeCards.forEach(card => {
                card.addEventListener('click', () => {
                  const selectedTheme = card.getAttribute('data-theme');
                  if (window.setTheme) {
                    window.setTheme(selectedTheme);
                  }
                });
              });
 
             const modalAdvancedUIToggle = modalEl.querySelector('#modalAdvancedUIToggle');
             if (modalAdvancedUIToggle) {
               modalAdvancedUIToggle.addEventListener('change', (e) => {
                 const checked = e.target.checked;
                 localStorage.setItem('advanced_ui_enabled', checked ? 'true' : 'false');
                 updateAdvancedUIContainerState(checked);
                 if (window.applyAllUIPreferences) window.applyAllUIPreferences();
               });
             }

             const modalRandomColorsToggle = modalEl.querySelector('#modalRandomColorsToggle');
             if (modalRandomColorsToggle) {
               modalRandomColorsToggle.addEventListener('change', (e) => {
                 localStorage.setItem('random_button_colors', e.target.checked ? 'true' : 'false');
                 if (window.applyRandomButtonColors) window.applyRandomButtonColors();
               });
             }
             
             const modalCursorToggle = modalEl.querySelector('#modalCursorToggle');
             if (modalCursorToggle) {
               modalCursorToggle.addEventListener('change', (e) => {
                 localStorage.setItem('splash_cursor_enabled', e.target.checked ? 'true' : 'false');
                 if (window.toggleSplashCursor) window.toggleSplashCursor(e.target.checked);
               });
             }
             
             const modalSplashDensitySlider = modalEl.querySelector('#modalSplashDensitySlider');
             if (modalSplashDensitySlider) {
               modalSplashDensitySlider.addEventListener('input', (e) => {
                 if (window.updateSplashDensity) {
                   window.updateSplashDensity(e.target.value);
                   const valSpan = modalEl.querySelector('#modalSplashDensityVal');
                   if (valSpan) valSpan.textContent = e.target.value;
                 }
               });
             }
 
             const modalHeaderToggle = modalEl.querySelector('#modalHeaderToggle');
             if (modalHeaderToggle) {
               modalHeaderToggle.addEventListener('change', (e) => {
                 const checked = e.target.checked;
                 localStorage.setItem('dynamic_header_enabled', checked ? 'true' : 'false');
                 
                 // Dynamically enable/disable falling text toggle in modal
                 const ftToggle = modalEl.querySelector('#modalFallingTextToggle');
                 if (ftToggle) {
                   if (checked) {
                     ftToggle.removeAttribute('disabled');
                     ftToggle.parentElement.parentElement.style.opacity = '1';
                   } else {
                     ftToggle.setAttribute('disabled', 'true');
                     ftToggle.parentElement.parentElement.style.opacity = '0.4';
                   }
                 }
                 
                 if (window.applyAllUIPreferences) window.applyAllUIPreferences();
               });
             }

             const modalFallingTextToggle = modalEl.querySelector('#modalFallingTextToggle');
             if (modalFallingTextToggle) {
               modalFallingTextToggle.addEventListener('change', (e) => {
                 localStorage.setItem('falling_text_enabled', e.target.checked ? 'true' : 'false');
                 if (window.applyAllUIPreferences) window.applyAllUIPreferences();
               });
             }

             const modalNavigationStyleSelect = modalEl.querySelector('#modalNavigationStyleSelect');
             if (modalNavigationStyleSelect) {
               modalNavigationStyleSelect.addEventListener('change', (e) => {
                 const val = e.detail ? e.detail.value : e.target.value;
                 localStorage.setItem('header_navigation_style', val);
                 if (window.headerDockInstance) {
                   window.headerDockInstance.transformNav();
                 }
               });
             }
 
           }
           
           const activeModal = document.getElementById('globalSettingsModal');
           if (activeModal) {
             activeModal.classList.add('active');
             // Sync theme cards active states
               const currentTheme = localStorage.getItem('theme') || 'dark';
               activeModal.querySelectorAll('.theme-card').forEach(card => {
                 if (card.getAttribute('data-theme') === currentTheme) {
                   card.classList.add('active');
                 } else {
                   card.classList.remove('active');
                 }
               });

               // Render accent color options on all pages
               const isRecruiter = document.body.classList.contains('recruiter-page');
               const colorsSection = activeModal.querySelector('#themeColorsSection');
               const colorsSectionTitle = activeModal.querySelector('#themeColorsSectionTitle');
               if (colorsSection) {
                 colorsSection.style.display = 'block';
                 if (colorsSectionTitle) {
                   colorsSectionTitle.textContent = 'Accent Color';
                 }
                 if (window.renderAccentColors) {
                   window.renderAccentColors(activeModal, isRecruiter ? 'recruiter' : 'seeker', currentTheme);
                 }
               }
 
             const isAdvancedUI = localStorage.getItem('advanced_ui_enabled') === 'true';
             const modalAdvancedUIToggle = activeModal.querySelector('#modalAdvancedUIToggle');
             if (modalAdvancedUIToggle) {
               modalAdvancedUIToggle.checked = isAdvancedUI;
             }

             const isRandomColors = localStorage.getItem('random_button_colors') === 'true';
             const modalRandomColorsToggle = activeModal.querySelector('#modalRandomColorsToggle');
             if (modalRandomColorsToggle) {
               modalRandomColorsToggle.checked = isRandomColors;
             }
             
             const modalCursorToggle = activeModal.querySelector('#modalCursorToggle');
             if (modalCursorToggle) {
               modalCursorToggle.checked = localStorage.getItem('splash_cursor_enabled') === 'true';
             }
             
             const densityVal = localStorage.getItem('splash_cursor_density_slider') || '7';
             const modalSplashDensitySlider = activeModal.querySelector('#modalSplashDensitySlider');
             if (modalSplashDensitySlider) {
               modalSplashDensitySlider.value = densityVal;
             }
             const modalSplashDensityVal = activeModal.querySelector('#modalSplashDensityVal');
             if (modalSplashDensityVal) {
               modalSplashDensityVal.textContent = densityVal;
             }
 
             const modalHeaderToggle = activeModal.querySelector('#modalHeaderToggle');
             if (modalHeaderToggle) {
               modalHeaderToggle.checked = localStorage.getItem('dynamic_header_enabled') === 'true';
             }

             const modalFallingTextToggle = activeModal.querySelector('#modalFallingTextToggle');
             if (modalFallingTextToggle) {
               modalFallingTextToggle.checked = localStorage.getItem('falling_text_enabled') === 'true';
             }

             const modalNavigationStyleSelect = activeModal.querySelector('#modalNavigationStyleSelect');
             if (modalNavigationStyleSelect) {
               setCustomSelectValue(modalNavigationStyleSelect, localStorage.getItem('header_navigation_style') || 'text');
             }
 
             // Sync visual disabled state of container
             const advancedUIOptionsContainer = activeModal.querySelector('#advancedUIOptionsContainer');
             if (advancedUIOptionsContainer) {
               if (isAdvancedUI) {
                 advancedUIOptionsContainer.style.opacity = '1';
                 advancedUIOptionsContainer.style.pointerEvents = 'auto';
                 advancedUIOptionsContainer.querySelectorAll('input, select').forEach(el => {
                   el.removeAttribute('disabled');
                 });
                 advancedUIOptionsContainer.querySelectorAll('.custom-select-container').forEach(el => {
                   el.removeAttribute('disabled');
                   el.style.pointerEvents = 'auto';
                   el.style.opacity = '1';
                 });
                 // Also disable/enable falling text toggle based on dynamic header toggle
                 const headerChecked = localStorage.getItem('dynamic_header_enabled') === 'true';
                 const ftToggle = activeModal.querySelector('#modalFallingTextToggle');
                 if (ftToggle) {
                   if (headerChecked) {
                     ftToggle.removeAttribute('disabled');
                     ftToggle.parentElement.parentElement.style.opacity = '1';
                   } else {
                     ftToggle.setAttribute('disabled', 'true');
                     ftToggle.parentElement.parentElement.style.opacity = '0.4';
                   }
                 }
               } else {
                 advancedUIOptionsContainer.style.opacity = '0.4';
                 advancedUIOptionsContainer.style.pointerEvents = 'none';
                 advancedUIOptionsContainer.querySelectorAll('input, select').forEach(el => {
                   el.setAttribute('disabled', 'true');
                 });
                 advancedUIOptionsContainer.querySelectorAll('.custom-select-container').forEach(el => {
                   el.setAttribute('disabled', 'true');
                   el.style.pointerEvents = 'none';
                   el.style.opacity = '0.4';
                 });
               }
             }
            
            const modalAccountType = activeModal.querySelector('#modalAccountType');
            if (modalAccountType) {
              modalAccountType.textContent = window.location.pathname.includes('/recruiter/') ? 'Recruiter' : 'Candidate';
            }
          }
        });
      }

      const triggers = headerWrapper.querySelectorAll('.dropdown-trigger');
      triggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const parent = trigger.parentElement;
          const menu = parent.querySelector('.header-dropdown-menu');

          // Close other dropdowns
          headerWrapper.querySelectorAll('.header-dropdown-menu').forEach(m => {
            if (m !== menu) m.classList.remove('active');
          });

          if (menu) {
            menu.classList.toggle('active');
          }
        });
      });

      // Close dropdowns on clicking outside
      document.addEventListener('click', () => {
        headerWrapper.querySelectorAll('.header-dropdown-menu').forEach(m => m.classList.remove('active'));
      });

      // Prevent clicks inside dropdown menu from closing it
      headerWrapper.querySelectorAll('.header-dropdown-menu').forEach(menu => {
        menu.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      });

      // 7. Set active navigation tab dynamically
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const navLinks = headerWrapper.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref && !linkHref.startsWith('#')) {
          if (linkHref === currentPath) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        }
      });

      // 8. About Panel Toggle (Vertical Pill Expansion)
      const logoLink = document.getElementById('logoLink');
      const closeAboutBtn = document.getElementById('closeAboutBtn');
      const header = document.getElementById('mainHeader');
      const floatingBtn = document.getElementById('floatingSarthiBtn');

      function lockScroll() {
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      function unlockScroll() {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }

      function toggleAbout(e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (!header) return;
        const isExpanded = header.classList.contains('about-active');
        if (isExpanded) {
          header.classList.remove('about-active');
          document.body.classList.remove('about-active');
          unlockScroll();
          if (floatingBtn) {
            floatingBtn.style.opacity = '1';
            floatingBtn.style.pointerEvents = 'auto';
          }
          if (window.resetAboutPhysics) {
            window.resetAboutPhysics();
          }
          if (localStorage.getItem('splash_cursor_enabled') === 'true' && window.initSplashCursor) {
            window.initSplashCursor();
          }
        } else {
          header.classList.add('about-active');
          document.body.classList.add('about-active');
          lockScroll();
          if (floatingBtn) {
            floatingBtn.style.opacity = '0';
            floatingBtn.style.pointerEvents = 'none';
          }
          if (window.disableSplashCursor) {
            window.disableSplashCursor();
          }
          if (window.initAboutPhysics) {
            window.initAboutPhysics();
          }
        }
      }

      if (logoLink) {
        logoLink.addEventListener('click', toggleAbout);
      }
      if (closeAboutBtn) {
        closeAboutBtn.addEventListener('click', toggleAbout);
      }

      // Close About panel when clicking outside of it
      document.addEventListener('click', (e) => {
        if (header && header.classList.contains('about-active')) {
          if (window.isAboutPhysicsActive) return; // Prevent closing on click outside if playing with physics
          if (!header.contains(e.target) && e.target !== logoLink && !logoLink.contains(e.target)) {
            header.classList.remove('about-active');
            document.body.classList.remove('about-active');
            unlockScroll();
            if (floatingBtn) {
              floatingBtn.style.opacity = '1';
              floatingBtn.style.pointerEvents = 'auto';
            }
            if (window.resetAboutPhysics) {
              window.resetAboutPhysics();
            }
            if (localStorage.getItem('splash_cursor_enabled') === 'true' && window.initSplashCursor) {
              window.initSplashCursor();
            }
          }
        }
      });

      // 9. Inject Mobile Bottom Nav
      if (isSeeker || isRecruiter) {
        const oldMobileNav = document.querySelector('.mobile-bottom-nav');
        if (oldMobileNav) oldMobileNav.remove();

        const mobileNavContainer = document.createElement('div');
        mobileNavContainer.className = 'mobile-bottom-nav';

        let navItems = [];
        if (isSeeker) {
          navItems = [
            { name: 'Dashboard', href: 'index.html', icon: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>` },
            { name: 'Resume', href: 'resume.html', icon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>` },
            { name: 'Jobs', href: 'jobs.html', icon: `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>` },
            { name: 'Analytics', href: 'analytics.html', icon: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>` },
            { name: 'Messages', href: 'messages.html', icon: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>` }
          ];
        } else {
          navItems = [
            { name: 'Dashboard', href: 'index.html', icon: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>` },
            { name: 'Create Job', href: 'create_job.html', icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>` },
            { name: 'Applicants', href: 'applicants.html', icon: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>` },
            { name: 'Analytics', href: 'analytics.html', icon: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>` },
            { name: 'Messages', href: 'messages.html', icon: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>` }
          ];
        }

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        mobileNavContainer.innerHTML = navItems.map(item => {
          const isActive = item.href === currentPath;
          return `<a href="${item.href}" class="mobile-nav-item ${isActive ? 'active' : ''}">
            ${item.icon}
            <span>${item.name}</span>
          </a>`;
        }).join('');

        document.body.appendChild(mobileNavContainer);
      }
      // Inject Dock CSS & JS dynamically with cache busting
      if (!document.querySelector('link[href*="Dock.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${prefix}css/Dock.css?v=${Date.now()}`;
        document.head.appendChild(link);
      }
      if (!document.querySelector('script[src*="Dock.js"]')) {
        const dockScript = document.createElement('script');
        dockScript.src = `${prefix}js/Dock.js?v=${Date.now()}`;
        document.head.appendChild(dockScript);
      }

      // Inject AboutPhysics JS dynamically with cache busting
      if (!document.querySelector('script[src*="AboutPhysics.js"]')) {
        const physicsScript = document.createElement('script');
        physicsScript.src = `${prefix}js/AboutPhysics.js?v=${Date.now()}`;
        document.body.appendChild(physicsScript);
      }

      // Dispatch a custom event to notify components that header is loaded
      document.dispatchEvent(new CustomEvent('headerLoaded', { detail: { prefix, isRecruiter, isSeeker } }));

      // Apply initial UI preferences
      if (window.applyAllUIPreferences) {
        window.applyAllUIPreferences();
      }

    } catch (err) {
      console.error("Error initializing common header components:", err);
    }
  }

  // Check if template script is already loaded in memory
  if (window.aboutContentHTML && window[headerVarName]) {
    initializeHeader();
  } else {
    // Dynamically load the JS templates file with cache busting
    const script = document.createElement('script');
    script.src = `${prefix}commonelements/headers.js?v=${Date.now()}`;
    script.onload = initializeHeader;
    script.onerror = () => {
      console.error("Failed to load header templates script from " + script.src);
    };
    document.head.appendChild(script);
  }
});

// Global UI preferences manager
window.applyAllUIPreferences = function () {
  const advancedUIEnabled = localStorage.getItem('advanced_ui_enabled') === 'true';
  
  if (window.headerDockInstance) {
    window.headerDockInstance.transformNav();
  }

  // 1. Splash Cursor
  const splashEnabled = advancedUIEnabled && localStorage.getItem('splash_cursor_enabled') === 'true';
  if (window.toggleSplashCursor) {
    window.toggleSplashCursor(splashEnabled);
  }
  
  // 2. Dynamic Header physics/shake
  const headerEnabled = advancedUIEnabled && localStorage.getItem('dynamic_header_enabled') === 'true';
  if (!headerEnabled) {
    if (window.resetAboutPhysics) window.resetAboutPhysics();
    // Collapse header if it was open
    const header = document.getElementById('mainHeader');
    if (header && header.classList.contains('about-active')) {
      header.classList.remove('about-active');
      document.body.classList.remove('about-active');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      const floatingBtn = document.getElementById('floatingSarthiBtn');
      if (floatingBtn) {
        floatingBtn.style.opacity = '1';
        floatingBtn.style.pointerEvents = 'auto';
      }
      if (localStorage.getItem('splash_cursor_enabled') === 'true' && window.initSplashCursor) {
        window.initSplashCursor();
      }
    }
  } else {
    // Re-initialize physics shake listener if header about panel is open
    const header = document.getElementById('mainHeader');
    if (header && header.classList.contains('about-active') && window.initAboutPhysics) {
      window.initAboutPhysics();
    }
  }

  // Inject styles to disable all header movements/animations (hover, dropdowns, sticky scroll transition)
  let headerOverrideStyle = document.getElementById('global-header-override-style');
  if (!headerOverrideStyle) {
    headerOverrideStyle = document.createElement('style');
    headerOverrideStyle.id = 'global-header-override-style';
    document.head.appendChild(headerOverrideStyle);
  }

  if (!headerEnabled) {
    headerOverrideStyle.textContent = `
      /* Disable logo hover scaling and transition */
      .logo span, .logo:hover span {
        transform: none !important;
        letter-spacing: normal !important;
        transition: none !important;
      }
      /* Disable dropdown translation/scaling and set instant transition */
      .header-dropdown-menu {
        transition: none !important;
        transform: none !important;
        transform-origin: unset !important;
      }
      /* Disable scroll position transition */
      .header {
        transition: none !important;
      }
      /* Disable vertical panel expand animations */
      .header.about-active {
        transition: none !important;
      }
      .about-content {
        transition: none !important;
        transform: none !important;
      }
      #closeAboutBtn {
        transition: none !important;
      }
      /* Disable Settings button spin */
      .btn-icon[aria-label="Settings"] svg, .btn-icon[aria-label="Settings"] {
        transform: none !important;
        transition: none !important;
        animation: none !important;
      }
      .btn-icon[aria-label="Settings"]:hover svg {
        transform: none !important;
      }
      /* Disable Notification bell ring */
      .btn-icon[aria-label="Notifications"] svg, .btn-icon[aria-label="Notifications"] {
        transform: none !important;
        transition: none !important;
        animation: none !important;
      }
      .btn-icon[aria-label="Notifications"]:hover svg {
        animation: none !important;
      }
      /* Disable Profile badge bounce */
      .profile-badge, .profile-badge:hover {
        transform: none !important;
        transition: none !important;
      }
      /* Disable Finder & Recruiter button scaling and padding transition */
      .header-actions .btn-glow, .header-actions .btn-glow:hover {
        transform: none !important;
        transition: none !important;
        padding: 8px 16px !important;
        box-shadow: none !important;
      }
      /* Disable Settings 5 tabs transitions */
      .settings-tab-btn, .settings-tab-btn:hover, .settings-tab-btn.active {
        transition: none !important;
      }
      /* Disable Dock transitions/transformations if using icons */
      .dock-item, .dock-item:hover, .dock-item-bg, .dock-item:hover .dock-item-bg, .dock-icon, .dock-icon svg, .dock-tooltip {
        transform: none !important;
        transition: none !important;
      }
    `;
  } else {
    headerOverrideStyle.textContent = '';
  }

  // Clean up any old bg glow override
  const glowStyle = document.getElementById('global-bg-glow-override-style');
  if (glowStyle) glowStyle.remove();
  
  // Clean up any old sarthi pill override
  const sarthiPillStyle = document.getElementById('global-sarthi-pill-override-style');
  if (sarthiPillStyle) sarthiPillStyle.remove();
};

// Global Set Theme Function
window.setTheme = function (themeName) {
  if (themeName === 'pastel-light') themeName = 'light';
  if (themeName === 'pastel-dark') themeName = 'dark';

  document.body.classList.remove('light-theme', 'pastel-light-theme', 'pastel-dark-theme');
  document.documentElement.classList.remove('light-theme', 'pastel-light-theme', 'pastel-dark-theme');

  if (themeName === 'light') {
    document.body.classList.add('light-theme');
    document.documentElement.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
    // Re-apply saved accent color for light
    const savedAccent = localStorage.getItem('accent_color');
    if (savedAccent) {
      try { window.applyAccentColor(JSON.parse(savedAccent)); } catch(e) {}
    }
  } else {
    localStorage.setItem('theme', 'dark');
    // Re-apply saved accent color for dark
    const savedAccent = localStorage.getItem('accent_color');
    if (savedAccent) {
      try { window.applyAccentColor(JSON.parse(savedAccent)); } catch(e) {}
    }
  }
  
  // Sync header checkbox if present
  const checkbox = document.getElementById('themeToggleCheckbox');
  if (checkbox) checkbox.checked = (themeName === 'light');

  // Sync active state visually on theme cards if modal is open
  const activeModal = document.getElementById('globalSettingsModal');
  if (activeModal) {
    activeModal.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-theme') === themeName);
    });

    const colorsSection = activeModal.querySelector('#themeColorsSection');
    const colorsSectionTitle = activeModal.querySelector('#themeColorsSectionTitle');
    if (colorsSection) {
      colorsSection.style.display = 'block';
      if (colorsSectionTitle) {
        colorsSectionTitle.textContent = 'Accent Color';
      }
      const isRecruiter = document.body.classList.contains('recruiter-page');
      if (window.renderAccentColors) {
        window.renderAccentColors(activeModal, isRecruiter ? 'recruiter' : 'seeker', themeName);
      }
    }
  }

  if (window.applyRandomButtonColors) {
    window.applyRandomButtonColors();
  }
};

// Global Toggle Theme Function
window.toggleTheme = function () {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  if (currentTheme === 'light') {
    window.setTheme('dark');
  } else {
    window.setTheme('light');
  }
};

// Global Logout Function
window.logout = function () {
  const keysToRemove = [
    'seeker_logged_in', 'seeker_name', 'seeker_email', 'seeker_avatar_url', 'applied_jobs', 'seeker_notifications',
    'seeker_profile_data', 'seeker_apps_count', 'seeker_interviews_count',
    'recruiter_logged_in', 'recruiter_company', 'recruiter_email',
    'recruiter_applicants_list', 'recruiter_jobs_count'
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));
  try { sessionStorage.clear(); } catch(e) {}

  const isLanding = !window.location.pathname.includes('/seeker/') && !window.location.pathname.includes('/recruiter/');
  const prefix = isLanding ? './' : '../';
  window.location.replace(`${prefix}index.html`);
};




// Color Accent Lists
const seekerColors = [
  { name: 'Default Blue', key: 'blue', secondary: '#2563eb', tertiary: '#3b82f6', hover: '#1d4ed8', focus: 'rgba(59, 130, 246, 0.4)' },
  { name: 'Neon Indigo', key: 'indigo', secondary: '#5f5af6', tertiary: '#818cf8', hover: '#4f46e5', focus: 'rgba(95, 90, 246, 0.4)' },
  { name: 'Cyber Turquoise', key: 'turquoise', secondary: '#06b6d4', tertiary: '#22d3ee', hover: '#0891b2', focus: 'rgba(6, 182, 212, 0.4)' },
  { name: 'Vivid Mint', key: 'mint', secondary: '#10b981', tertiary: '#34d399', hover: '#059669', focus: 'rgba(16, 185, 129, 0.4)' },
  { name: 'Electric Purple', key: 'purple', secondary: '#8b5cf6', tertiary: '#a78bfa', hover: '#7c3aed', focus: 'rgba(139, 92, 246, 0.4)' },
  { name: 'Ultra Magenta', key: 'magenta', secondary: '#ec4899', tertiary: '#f472b6', hover: '#db2777', focus: 'rgba(236, 72, 153, 0.4)' },
  { name: 'Sunset Coral', key: 'coral', secondary: '#f97316', tertiary: '#fb923c', hover: '#ea580c', focus: 'rgba(249, 115, 22, 0.4)' },
  { name: 'Crimson Rose', key: 'rose', secondary: '#f43f5e', tertiary: '#fb7185', hover: '#e11d48', focus: 'rgba(244, 63, 94, 0.4)' },
  { name: 'Sky Breeze', key: 'sky', secondary: '#0ea5e9', tertiary: '#38bdf8', hover: '#0284c7', focus: 'rgba(14, 165, 233, 0.4)' },
  { name: 'Aura Amber', key: 'amber', secondary: '#d97706', tertiary: '#f59e0b', hover: '#b45309', focus: 'rgba(217, 119, 6, 0.4)' },
  { name: 'Spring Lime', key: 'lime', secondary: '#84cc16', tertiary: '#a3e635', hover: '#65a30d', focus: 'rgba(132, 204, 22, 0.4)' },
  { name: 'Slate Titanium', key: 'slate', secondary: '#475569', tertiary: '#64748b', hover: '#334155', focus: 'rgba(71, 85, 105, 0.4)' }
];

const recruiterColors = [
  { name: 'Default Magenta', key: 'magenta', secondary: '#db2777', tertiary: '#ec4899', hover: '#be185d', focus: 'rgba(219, 39, 119, 0.4)' },
  { name: 'Neon Rose', key: 'rose', secondary: '#e11d48', tertiary: '#f43f5e', hover: '#be123c', focus: 'rgba(225, 29, 72, 0.4)' },
  { name: 'Electric Purple', key: 'purple', secondary: '#9333ea', tertiary: '#a855f7', hover: '#7e22ce', focus: 'rgba(147, 51, 234, 0.4)' },
  { name: 'Stripe Violet', key: 'violet', secondary: '#6366f1', tertiary: '#818cf8', hover: '#4f46e5', focus: 'rgba(99, 102, 241, 0.4)' },
  { name: 'Flame Orange', key: 'orange', secondary: '#ea580c', tertiary: '#f97316', hover: '#c2410c', focus: 'rgba(234, 88, 12, 0.4)' },
  { name: 'Teal Spark', key: 'teal', secondary: '#0d9488', tertiary: '#14b8a6', hover: '#0f766e', focus: 'rgba(13, 148, 136, 0.4)' },
  { name: 'Forest Mint', key: 'mint', secondary: '#059669', tertiary: '#10b981', hover: '#047857', focus: 'rgba(5, 150, 105, 0.4)' },
  { name: 'Royal Indigo', key: 'indigo', secondary: '#4338ca', tertiary: '#4f46e5', hover: '#3730a3', focus: 'rgba(67, 56, 202, 0.4)' },
  { name: 'Sky Glacier', key: 'sky', secondary: '#0284c7', tertiary: '#0ea5e9', hover: '#0369a1', focus: 'rgba(2, 132, 199, 0.4)' },
  { name: 'Plum Orchid', key: 'plum', secondary: '#a21caf', tertiary: '#c084fc', hover: '#86198f', focus: 'rgba(162, 28, 175, 0.4)' },
  { name: 'Gold Amber', key: 'gold', secondary: '#ca8a04', tertiary: '#eab308', hover: '#a16207', focus: 'rgba(202, 138, 4, 0.4)' },
  { name: 'Deep Espresso', key: 'espresso', secondary: '#78350f', tertiary: '#92400e', hover: '#451a03', focus: 'rgba(120, 53, 15, 0.4)' }
];

// Global Apply Accent Color function
window.applyAccentColor = function (accentData) {
  if (accentData) {
    document.body.style.setProperty('--accent-secondary', accentData.secondary);
    document.body.style.setProperty('--accent-tertiary', accentData.tertiary);
    document.body.style.setProperty('--border-focus', accentData.focus);
    document.body.style.setProperty('--accent-secondary-hover', accentData.hover);
    localStorage.setItem('accent_color', JSON.stringify(accentData));
  } else {
    document.body.style.removeProperty('--accent-secondary');
    document.body.style.removeProperty('--accent-tertiary');
    document.body.style.removeProperty('--border-focus');
    document.body.style.removeProperty('--accent-secondary-hover');
    localStorage.removeItem('accent_color');
  }
};

// Render color items dynamically in settings modal
window.renderAccentColors = function (modalEl, portalType, currentTheme) {
  const container = modalEl.querySelector('#themeColorsContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  const colorsList = (portalType === 'seeker') ? seekerColors : recruiterColors;
  const savedAccent = localStorage.getItem('accent_color');
  let activeKey = '';
  if (savedAccent) {
    try {
      const parsed = JSON.parse(savedAccent);
      const match = colorsList.find(c => c.secondary.toLowerCase() === parsed.secondary.toLowerCase());
      if (match) activeKey = match.key;
    } catch(e) {}
  }
  if (!activeKey) activeKey = colorsList[0].key;
  
  colorsList.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'item-color';
    if (color.key === activeKey) btn.classList.add('active');
    btn.setAttribute('aria-color', color.name);
    btn.setAttribute('data-color-key', color.key);
    btn.style.setProperty('--color', color.secondary);
    btn.addEventListener('click', () => {
      container.querySelectorAll('.item-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.applyAccentColor(color);
    });
    container.appendChild(btn);
  });
};

// Global function to apply static randomized colors to buttons
window.applyRandomButtonColors = function() {
  const enabled = localStorage.getItem('random_button_colors') === 'true';
  const buttons = document.querySelectorAll('button, .btn, .btn-primary, .btn-secondary, .btn-glow, .btn-open-job, .btn-apply');
  
  if (!enabled) {
    buttons.forEach(btn => {
      // Don't modify color picker buttons
      if (!btn.classList.contains('item-color')) {
        btn.style.removeProperty('background');
        btn.style.removeProperty('background-image');
        btn.style.removeProperty('color');
        btn.style.removeProperty('border-color');
      }
    });
    return;
  }
  
  // 12 beautiful colors for button backgrounds
  const colors = ['#6b21a8', '#be185d', '#0284c7', '#16a34a', '#ea580c', '#ca8a04', '#0d9488', '#7c3aed', '#f43f5e', '#d97706', '#c026d3', '#06b6d4'];
  
  buttons.forEach(btn => {
    // Skip color pickers, theme toggle, delete, remove, like buttons
    const txt = (btn.innerText || btn.textContent || '').toLowerCase();
    const isDeleteOrLike = 
      btn.classList.contains('btn-danger') ||
      btn.classList.contains('delete-btn') ||
      btn.classList.contains('btn-like-card') ||
      btn.classList.contains('item-color') ||
      btn.id === 'themeToggleCheckbox' ||
      btn.id === 'modalRandomColorsToggle' ||
      btn.id === 'modalAdvancedUIToggle' ||
      btn.id === 'modalCursorToggle' ||
      btn.closest('#themeColorsContainer') ||
      btn.getAttribute('aria-label') === 'Like' ||
      btn.getAttribute('aria-label') === 'Bookmark' ||
      txt.includes('delete') ||
      txt.includes('like') ||
      txt.includes('remove') ||
      txt.includes('reject');
      
    if (isDeleteOrLike) {
      // Let standard red styles apply
      return;
    }
    
    // Hash button content/class/id to assign a stable ("not changing") random color
    let hash = 0;
    const str = btn.innerText || btn.className || btn.id || 'btn';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];
    
    // Set colors with !important to override other rules cleanly
    btn.style.setProperty('background', color, 'important');
    btn.style.setProperty('background-image', 'none', 'important');
    btn.style.setProperty('color', '#ffffff', 'important');
    btn.style.setProperty('border-color', color, 'important');
  });
};

// Start periodic checker to colorize dynamically loaded buttons
setInterval(() => {
  if (window.applyRandomButtonColors) {
    window.applyRandomButtonColors();
  }
}, 1000);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.applyRandomButtonColors) window.applyRandomButtonColors();
  }, 500);
});
