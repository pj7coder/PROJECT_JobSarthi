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
      const initialTheme = localStorage.getItem('theme') || 'dark';
      if (window.setTheme) {
        window.setTheme(initialTheme);
      } else {
        document.documentElement.classList.add(initialTheme + '-theme');
        document.body.classList.add(initialTheme + '-theme');
      }

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
                        <!-- Pastel Theme Card -->
                        <div class="theme-card" id="themeCardPastel" data-theme="pastel">
                          <div class="theme-card-preview theme-preview-pastel" style="background: #f8fafc; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px; box-sizing: border-box;">
                            <div class="preview-header" style="height: 12px; background: #ffffff; border-bottom: 1px solid #e2e8f0;"></div>
                            <div class="preview-body" style="flex: 1; background: #ffffff;"></div>
                          </div>
                          <div class="theme-card-label">Pastel Theme</div>
                        </div>
                      </div>
                      
                      <!-- Color Accent Options Section -->
                      <div id="themeColorsSection" class="theme-colors-section" style="display: none;">
                        <span class="setting-item-title" style="font-weight: 600;">Accent Color</span>
                        <p class="setting-item-desc" style="margin: 0 0 8px 0; font-size: 0.82rem; color: var(--text-muted);">Personalize the workspace highlight color.</p>
                        <div class="container-items" id="themeColorsContainer">
                          <!-- Filled dynamically by JavaScript -->
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
              if (colorsSection) {
                colorsSection.style.display = 'flex';
                if (window.renderAccentColors) {
                  window.renderAccentColors(activeModal, isRecruiter ? 'recruiter' : 'seeker');
                }
              }
 
             const isAdvancedUI = localStorage.getItem('advanced_ui_enabled') === 'true';
             const modalAdvancedUIToggle = activeModal.querySelector('#modalAdvancedUIToggle');
             if (modalAdvancedUIToggle) {
               modalAdvancedUIToggle.checked = isAdvancedUI;
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
  document.body.classList.remove('light-theme', 'pastel-theme');
  document.documentElement.classList.remove('light-theme', 'pastel-theme');
  
  // Remove any existing sidebar widget first
  const existingWidget = document.getElementById('sarthiThemeSidebarWidget');
  if (existingWidget) {
    existingWidget.remove();
  }

  if (themeName === 'light') {
    document.body.classList.add('light-theme');
    document.documentElement.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  } else if (themeName === 'pastel') {
    document.body.classList.add('pastel-theme');
    document.documentElement.classList.add('pastel-theme');
    localStorage.setItem('theme', 'pastel');
    
    // Inject the pastel sidebar widget
    if (typeof injectSidebarWidget === 'function') {
      injectSidebarWidget();
    }
  } else {
    localStorage.setItem('theme', 'dark');
  }
  
  // Sync header checkbox if present
  const checkbox = document.getElementById('themeToggleCheckbox');
  if (checkbox) checkbox.checked = (themeName === 'light');

  // Sync active state visually on theme cards if modal is open
  const activeModal = document.getElementById('globalSettingsModal');
  if (activeModal) {
    activeModal.querySelectorAll('.theme-card').forEach(card => {
      if (card.getAttribute('data-theme') === themeName) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }
};

// Global Toggle Theme Function
window.toggleTheme = function () {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  let nextTheme = 'dark';
  if (currentTheme === 'dark') {
    nextTheme = 'light';
  } else if (currentTheme === 'light') {
    nextTheme = 'pastel';
  } else {
    nextTheme = 'dark';
  }
  window.setTheme(nextTheme);
};

// Sidebar Widget Injection function
function injectSidebarWidget() {
  if (document.getElementById('sarthiThemeSidebarWidget')) return;
  
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'sarthiThemeSidebarWidget';
  widgetContainer.className = 'theme-sidebar-widget';
  
  widgetContainer.innerHTML = `
    <ul class="w-64 flex flex-col gap-1 border-l border-gray-200 pl-1">
      <li
        class="group w-14 overflow-hidden rounded-lg border-l border-transparent bg-white transition-all duration-500 hover:w-64 hover:border-gray-200 hover:shadow-lg has-[:focus]:w-64 has-[:focus]:shadow-lg"
      >
        <button
          class="peer flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-purple-800 transition-all active:scale-95"
        >
          <div class="peer-icon-container rounded-lg border-2 border-purple-300 bg-purple-100 p-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
              ></path>
            </svg>
          </div>
          <div class="font-semibold">Notifications</div>
        </button>
        <div
          class="grid grid-rows-[0fr] overflow-hidden transition-all duration-500 peer-focus:grid-rows-[1fr]"
        >
          <div class="overflow-hidden">
            <ul class="divide-y divide-gray-200 p-4 pt-0">
              <li class="py-2">
                <div class="flex items-center justify-between">
                  <button
                    class="cursor-pointer font-semibold text-gray-800 hover:text-blue-600"
                  >
                    Email
                  </button>
                  <div class="text-sm text-gray-500">2m ago</div>
                </div>
                <div class="text-xs text-gray-500">from Sarthi AI Seeker Match</div>
              </li>
              <li class="py-1">
                <div class="flex items-center justify-between">
                  <button
                    class="cursor-pointer font-semibold text-gray-800 hover:text-blue-600"
                  >
                    Request
                  </button>
                  <div class="text-sm text-gray-500">14m ago</div>
                </div>
                <div class="text-xs text-gray-500">from Matrix Minds Corp</div>
              </li>
            </ul>
          </div>
        </div>
      </li>
      <li
        class="group w-14 overflow-hidden rounded-lg border-l border-transparent bg-white transition-all duration-500 hover:w-64 hover:border-gray-200 hover:shadow-lg has-[:focus]:w-64 has-[:focus]:shadow-lg"
      >
        <button
          class="peer flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-blue-800 transition-all active:scale-95"
        >
          <div class="peer-icon-container rounded-lg border-2 border-blue-300 bg-blue-100 p-1">
            <svg
              class="size-6"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                stroke-linejoin="round"
                stroke-linecap="round"
              ></path>
              <path
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                stroke-linejoin="round"
                stroke-linecap="round"
              ></path>
            </svg>
          </div>
          <div class="font-semibold">Settings</div>
        </button>
        <div
          class="grid grid-rows-[0fr] overflow-hidden transition-all duration-500 peer-focus:grid-rows-[1fr]"
        >
          <div class="overflow-hidden">
            <ul class="divide-y divide-gray-200 p-4 pt-0">
              <li class="py-2">
                <div class="flex items-center justify-between">
                  <button
                    class="peer text-gray-800 hover:text-blue-600"
                    onclick="window.openSystemPreferences()"
                  >
                    System Preferences
                  </button>
                  <div
                    class="text-sm text-gray-500 transition-all peer-hover:translate-x-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      ></path>
                    </svg>
                  </div>
                </div>
                <div class="text-xs text-gray-500">Go to details</div>
              </li>
              <li class="py-1">
                <div class="group/title flex items-center justify-between">
                  <button
                    class="peer text-gray-800 hover:text-blue-600"
                    onclick="window.toggleTheme()"
                  >
                    Theme
                  </button>
                  <div
                    class="text-sm text-gray-500 transition-all peer-hover:translate-x-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      ></path>
                    </svg>
                  </div>
                </div>
                <div class="text-xs text-gray-500">Light / Dark / Pastel</div>
              </li>
            </ul>
          </div>
        </div>
      </li>
      <li
        class="group w-14 overflow-hidden rounded-lg border-l border-transparent bg-white transition-all duration-500 hover:w-64 hover:border-gray-200 hover:shadow-lg has-[:focus]:w-64 has-[:focus]:shadow-lg"
      >
        <button
          class="peer flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-green-800 transition-all active:scale-95"
        >
          <div class="peer-icon-container rounded-lg border-2 border-green-300 bg-green-100 p-1">
            <svg
              class="size-6"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                stroke-linejoin="round"
                stroke-linecap="round"
              ></path>
            </svg>
          </div>
          <div class="font-semibold">Chat</div>
        </button>
        <div
          class="grid grid-rows-[0fr] overflow-hidden transition-all duration-500 peer-focus:grid-rows-[1fr]"
        >
          <div class="overflow-hidden">
            <ul class="divide-y divide-gray-200 p-4 pt-0" id="widgetChatList">
              <li class="py-2">
                <div class="flex items-start gap-2">
                  <div class="h-8 w-8 rounded-full bg-gray-100 p-1 flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      ></path>
                    </svg>
                  </div>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                      <div class="font-semibold text-gray-800 text-sm">TARS</div>
                      <div class="text-xs text-gray-500">8:34 AM</div>
                    </div>
                    <div class="text-xs text-gray-500">
                      Hey TARS, what's your honesty parameter?
                    </div>
                  </div>
                </div>
              </li>
              <li class="py-2">
                <div class="flex items-start gap-2">
                  <div class="h-8 w-8 rounded-full bg-gray-100 p-1 flex items-center justify-center text-blue-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      ></path>
                    </svg>
                  </div>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                      <div class="font-semibold text-gray-800 text-sm">CASE</div>
                      <div class="text-xs text-gray-500">8:37 AM</div>
                    </div>
                    <div class="text-xs text-gray-500">90 percent.</div>
                  </div>
                </div>
              </li>
              <li class="py-2" style="border-bottom: none;">
                <div class="relative w-40 h-8">
                  <input
                    class="w-full h-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500"
                    placeholder="Reply"
                    type="text"
                    id="widgetChatInput"
                    style="padding-right: 28px;"
                  />
                  <button
                    class="absolute bottom-0 right-2 top-0 my-auto size-fit cursor-pointer text-blue-600 hover:text-blue-700"
                    id="widgetChatSendBtn"
                    style="border:none; background:transparent; padding:0; display:flex; align-items:center; justify-content:center;"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-6"
                      style="width: 18px; height: 18px;"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m15 11.25-3-3m0 0-3 3m3-3v7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </li>
    </ul>
  `;
  document.body.appendChild(widgetContainer);

  const chatInput = widgetContainer.querySelector('#widgetChatInput');
  const sendBtn = widgetContainer.querySelector('#widgetChatSendBtn');
  const chatList = widgetContainer.querySelector('#widgetChatList');

  const sendMessage = () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // Remove input li
    const inputLi = chatList.querySelector('li:last-child');
    if (inputLi) inputLi.remove();

    // User message
    const userLi = document.createElement('li');
    userLi.className = 'py-2';
    userLi.innerHTML = `
      <div class="flex items-start gap-2">
        <div class="h-8 w-8 rounded-full bg-blue-100 p-1 flex items-center justify-center text-blue-800 font-bold text-xs">
          ME
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <div class="font-semibold text-gray-800 text-sm">Me</div>
            <div class="text-xs text-gray-500">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
          <div class="text-xs text-gray-500">${text}</div>
        </div>
      </div>
    `;
    chatList.appendChild(userLi);
    chatList.appendChild(inputLi);
    chatInput.value = '';
    
    const newChatInput = chatList.querySelector('#widgetChatInput');
    const newSendBtn = chatList.querySelector('#widgetChatSendBtn');
    newChatInput.focus();

    newSendBtn.addEventListener('click', sendMessage);
    newChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Sarthi response
    setTimeout(() => {
      let reply = "I'm Sarthi AI. Ask me about jobs, resume tips, or interview preparation!";
      const textLower = text.toLowerCase();
      if (textLower.includes('honesty')) {
        reply = "95 percent. Actually, let's keep it at 90 percent for safety.";
      } else if (textLower.includes('hello') || textLower.includes('hi')) {
        reply = "Hello! How can Sarthi help you with your career goals today?";
      } else if (textLower.includes('job') || textLower.includes('work')) {
        reply = "I can help search matching jobs. Try checking out the Jobs section!";
      } else if (textLower.includes('interview')) {
        reply = "Try our AI Mock Interview simulator. It runs right in your browser!";
      }

      const inputLi2 = chatList.querySelector('li:last-child');
      if (inputLi2) inputLi2.remove();

      const sarthiLi = document.createElement('li');
      sarthiLi.className = 'py-2';
      sarthiLi.innerHTML = `
        <div class="flex items-start gap-2">
          <div class="h-8 w-8 rounded-full bg-gray-100 p-1 flex items-center justify-center text-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>
            </svg>
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <div class="font-semibold text-gray-800 text-sm">CASE</div>
              <div class="text-xs text-gray-500">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            <div class="text-xs text-gray-500">${reply}</div>
          </div>
        </div>
      `;
      chatList.appendChild(sarthiLi);
      chatList.appendChild(inputLi2);

      const finalChatInput = chatList.querySelector('#widgetChatInput');
      const finalSendBtn = chatList.querySelector('#widgetChatSendBtn');
      finalSendBtn.addEventListener('click', sendMessage);
      finalChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }, 1000);
  };

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

window.openSystemPreferences = function() {
  const settingsBtn = document.querySelector('[aria-label="Settings"]');
  if (settingsBtn) {
    settingsBtn.click();
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
window.renderAccentColors = function (modalEl, portalType) {
  const container = modalEl.querySelector('#themeColorsContainer');
  if (!container) return;
  
  // Clear container
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
  
  if (!activeKey) {
    activeKey = colorsList[0].key;
  }
  
  colorsList.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'item-color';
    if (color.key === activeKey) {
      btn.classList.add('active');
    }
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
