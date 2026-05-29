// JobSarthi Shared Header Script
// Dynamically loads the templates from commonelements/headers.js to bypass CORS issues on local filesystem.
document.addEventListener("DOMContentLoaded", () => {
  const isRecruiter = window.location.pathname.includes('/recruiter/');
  const isSeeker = window.location.pathname.includes('/seeker/');

  let prefix = './';
  let headerVarName = 'headerLandingHTML';

  if (isRecruiter) {
    prefix = '../';
    headerVarName = 'headerRecruiterHTML';
  } else if (isSeeker) {
    prefix = '../';
    headerVarName = 'headerSeekerHTML';
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
      if (localStorage.getItem('theme') === 'light') {
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
        const checkbox = document.getElementById('themeToggleCheckbox');
        if (checkbox) checkbox.checked = true;
      }

      // 3b. Initialize splash cursor settings state
      const splashEnabled = localStorage.getItem('splash_cursor_enabled') !== 'false';
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

      // 3c. Initialize fluid glass cursor settings state
      const fluidGlassEnabled = localStorage.getItem('fluid_glass_enabled') !== 'false';
      const fluidGlassCheckboxes = document.querySelectorAll('#fluidGlassToggleCheckbox');
      fluidGlassCheckboxes.forEach(cb => {
        cb.checked = fluidGlassEnabled;
      });

      const fluidGlassRadiusSliderVal = parseFloat(localStorage.getItem('fluid_glass_radius_slider') || '5');
      const fluidGlassSliders = document.querySelectorAll('#fluidGlassRadiusSlider');
      fluidGlassSliders.forEach(slider => {
        slider.value = fluidGlassRadiusSliderVal;
      });

      const fluidGlassValLabels = document.querySelectorAll('#fluidGlassRadiusVal');
      fluidGlassValLabels.forEach(label => {
        label.textContent = fluidGlassRadiusSliderVal.toFixed(0);
      });

      const radiusOptions = document.querySelectorAll('#fluidGlassRadiusOption');
      radiusOptions.forEach(opt => {
        opt.style.display = fluidGlassEnabled ? 'flex' : 'none';
      });

      // Inject SplashCursor script dynamically if it hasn't been loaded already
      if (!document.getElementById('splashCursorScript')) {
        const splashScript = document.createElement('script');
        splashScript.id = 'splashCursorScript';
        splashScript.src = prefix + 'js/SplashCursor.js';
        document.body.appendChild(splashScript);
      }

      // Inject FluidGlass script dynamically if it hasn't been loaded already
      if (!document.getElementById('fluidGlassScript')) {
        const glassScript = document.createElement('script');
        glassScript.id = 'fluidGlassScript';
        glassScript.src = prefix + 'js/FluidGlass.js';
        document.body.appendChild(glassScript);
      }

      // 4. Identify role and check authentication
      const isLanding = !isRecruiter && !isSeeker;
      if (!isLanding) {
        const authKey = isRecruiter ? 'recruiter_logged_in' : 'seeker_logged_in';
        if (localStorage.getItem(authKey) !== 'true') {
          window.location.href = 'login_signup.html';
          return;
        }
      }

      // 5. Setup User Profile Name & Initials
      const userName = isRecruiter
        ? (localStorage.getItem('recruiter_company') || 'Recruiter')
        : (localStorage.getItem('seeker_name') || 'Candidate User');
      const userEmail = isRecruiter
        ? (localStorage.getItem('recruiter_email') || 'recruiter@jobsarthi.ai')
        : (localStorage.getItem('seeker_email') || 'candidate@jobsarthi.ai');

      const initial = userName.charAt(0).toUpperCase();

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
      if (welcomeName) welcomeName.textContent = userName;

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
        fetch(`${prefix}api/seeker/profile?email=${encodeURIComponent(userEmail)}`)
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

      // 6. Dropdown Interactions
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
          unlockScroll();
          if (floatingBtn) {
            floatingBtn.style.opacity = '1';
            floatingBtn.style.pointerEvents = 'auto';
          }
          if (window.resetAboutPhysics) {
            window.resetAboutPhysics();
          }
        } else {
          header.classList.add('about-active');
          lockScroll();
          if (floatingBtn) {
            floatingBtn.style.opacity = '0';
            floatingBtn.style.pointerEvents = 'none';
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
          if (!header.contains(e.target) && e.target !== logoLink && !logoLink.contains(e.target)) {
            header.classList.remove('about-active');
            unlockScroll();
            if (floatingBtn) {
              floatingBtn.style.opacity = '1';
              floatingBtn.style.pointerEvents = 'auto';
            }
            if (window.resetAboutPhysics) {
              window.resetAboutPhysics();
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

// Global Toggle Theme Function
window.toggleTheme = function () {
  const isLight = document.body.classList.toggle('light-theme');
  document.documentElement.classList.toggle('light-theme', isLight);
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
};

// Global Logout Function
window.logout = function () {
  const isRecruiter = window.location.pathname.includes('/recruiter/');
  if (isRecruiter) {
    localStorage.removeItem('recruiter_logged_in');
    localStorage.removeItem('recruiter_company');
    localStorage.removeItem('recruiter_email');
  } else {
    localStorage.removeItem('seeker_logged_in');
    localStorage.removeItem('seeker_name');
    localStorage.removeItem('seeker_email');
  }
  const isLanding = !window.location.pathname.includes('/seeker/') && !window.location.pathname.includes('/recruiter/');
  const prefix = isLanding ? './' : '../';
  window.location.href = `${prefix}landing.html`;
};
