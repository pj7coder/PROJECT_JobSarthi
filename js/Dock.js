/**
 * Dock Navigation - Vanilla JS Component
 * 
 * Transforms standard navigation lists into an interactive Dock bar with 
 * magnification scaling and downward-facing labels.
 */

const DOCK_ICON_MAP = {
  'home': `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
  'portals': `<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>`,
  'reviews': `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  'sarthi ai': `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  'dashboard': `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`,
  'resume': `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  'jobs': `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
  'create job': `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`,
  'applicants': `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  'analytics': `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
  'messages': `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`
};

class HeaderDock {
  constructor(navElement, options = {}) {
    if (!navElement) return;
    this.nav = navElement;
    this.baseWidth = options.baseWidth || 40;
    this.baseHeight = options.baseHeight || 40;
    this.magnifiedWidth = options.magnifiedWidth || 50; // Compressed from 60
    this.magnifiedHeight = options.magnifiedHeight || 50; // Compressed from 60
    this.distance = options.distance || 85;
    this.active = false;
    
    this.originalNavHTML = null;
    this.originalClassName = null;
    
    this.transformNav();
  }
  
  transformNav() {
    // 1. Save or restore original nav structures
    if (!this.originalNavHTML) {
      this.originalNavHTML = this.nav.innerHTML;
      this.originalClassName = this.nav.className;
    } else {
      // Revert to original template structure to perform a clean transformation
      this.nav.innerHTML = this.originalNavHTML;
      this.nav.className = this.originalClassName;
    }

    const navLinksList = this.nav.querySelector('.nav-links');
    if (!navLinksList) return;
    
    // Find all anchors inside list items
    const anchors = Array.from(navLinksList.querySelectorAll('a.nav-link'));
    if (anchors.length === 0) return;

    // Apply active class based on current URL path
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    anchors.forEach(a => {
      const href = a.getAttribute('href');
      if (href && href === currentPath) {
        a.classList.add('active');
      }
    });
    
    // Create new pill-shape panel
    const panel = document.createElement('div');
    panel.className = 'dock-panel';
    
    const isAdvancedUI = localStorage.getItem('advanced_ui_enabled') !== 'false';
    const navStyle = isAdvancedUI ? (localStorage.getItem('header_navigation_style') || 'text') : 'text';
    
    // Map original anchors and update contents in place to preserve listeners
    anchors.forEach(a => {
      const labelText = a.textContent.trim() || a.getAttribute('data-label') || '';
      if (!a.getAttribute('data-label')) {
        a.setAttribute('data-label', labelText);
      }
      const finalLabel = a.getAttribute('data-label');
      const key = finalLabel.toLowerCase();
      const iconSvg = DOCK_ICON_MAP[key] || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
      
      if (navStyle === 'icon') {
        a.className = a.classList.contains('active') ? 'dock-item active' : 'dock-item';
        a.innerHTML = `
          <span class="dock-item-bg"></span>
          <span class="dock-icon">${iconSvg}</span>
          <span class="dock-tooltip">${finalLabel}</span>
        `;
      } else if (navStyle === 'both') {
        // Both style: Icon + Text
        a.className = a.classList.contains('active') ? 'dock-item active both-dock-item' : 'dock-item both-dock-item';
        a.innerHTML = `
          <span class="dock-item-bg"></span>
          <span class="dock-icon both-label">
            ${iconSvg}
            <span>${finalLabel}</span>
          </span>
        `;
      } else {
        // Text style pill nav
        a.className = a.classList.contains('active') ? 'dock-item active text-dock-item' : 'dock-item text-dock-item';
        a.innerHTML = `
          <span class="dock-item-bg"></span>
          <span class="dock-icon text-label">${finalLabel}</span>
        `;
      }
      
      panel.appendChild(a);
    });
    
    // Clean original nav-links list and substitute panel
    this.nav.innerHTML = '';
    this.nav.className = 'dock-outer';
    this.nav.appendChild(panel);
    
    this.panel = panel;
    this.items = Array.from(panel.querySelectorAll('.dock-item'));
    
    // Bind hover magnification interaction
    this.bindInteractions();
  }
  
  bindInteractions() {
    this.destroy(); // Unbind any prior listeners before re-binding
    
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    this.boundCache = () => this.cachePositions();
    
    this.panel.addEventListener('mousemove', this.boundOnMouseMove, { passive: true });
    this.panel.addEventListener('mouseleave', this.boundOnMouseLeave, { passive: true });
    this.panel.addEventListener('mouseenter', this.boundCache, { passive: true });
    window.addEventListener('resize', this.boundCache, { passive: true });
    
    this.cachePositions();
    this.resetSizes();
    this.active = true;
  }
  
  cachePositions() {
    this.itemPositions = this.items.map(item => {
      const rect = item.getBoundingClientRect();
      return {
        element: item,
        centerX: rect.left + rect.width / 2
      };
    });
  }
  
  onMouseMove(e) {
    if (!this.itemPositions) return;
    
    // Disable dock physics / magnification if Dynamic Header (or Advanced UI) is disabled
    const isHeaderEnabled = localStorage.getItem('advanced_ui_enabled') !== 'false' && localStorage.getItem('dynamic_header_enabled') !== 'false';
    if (!isHeaderEnabled) {
      this.resetSizes();
      return;
    }
    
    const mouseX = e.clientX;
    
    this.itemPositions.forEach(pos => {
      const dist = Math.abs(mouseX - pos.centerX);
      const item = pos.element;
      const bg = item.querySelector('.dock-item-bg');
      const icon = item.querySelector('.dock-icon');
      
      if (!bg || !icon) return;
      
      if (dist < this.distance) {
        const factor = 1 - (dist / this.distance);
        const smoothFactor = Math.sin(factor * Math.PI / 2);
        
        const targetWidth = this.baseWidth + (this.magnifiedWidth - this.baseWidth) * smoothFactor;
        const targetHeight = this.baseHeight + (this.magnifiedHeight - this.baseHeight) * smoothFactor;
        
        const scaleX = targetWidth / this.baseWidth;
        const scaleY = targetHeight / this.baseHeight;
        const translateY = 10 * smoothFactor;
        
        // Dynamically compute border-radius: goes from 16px (pill) to 10px (rounded square)
        const borderRadius = 16 - (16 - 10) * smoothFactor;
        
        bg.style.transform = `scale(${scaleX}, ${scaleY}) translateY(${translateY}px)`;
        bg.style.borderRadius = `${borderRadius}px`;
        icon.style.transform = `scale(${1 + 0.12 * smoothFactor}) translateY(${translateY}px)`;
        item.style.zIndex = Math.round(10 + smoothFactor * 10);
      } else {
        bg.style.transform = 'scale(1, 1) translateY(0)';
        bg.style.borderRadius = '16px';
        icon.style.transform = 'scale(1) translateY(0)';
        item.style.zIndex = '1';
      }
    });
  }
  
  onMouseLeave() {
    this.resetSizes();
  }
  
  resetSizes() {
    this.items.forEach(item => {
      const bg = item.querySelector('.dock-item-bg');
      const icon = item.querySelector('.dock-icon');
      item.style.zIndex = '1';
      
      if (bg) {
        bg.style.transform = 'scale(1, 1) translateY(0)';
        bg.style.borderRadius = '16px';
        bg.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      }
      if (icon) {
        icon.style.transform = 'scale(1) translateY(0)';
        icon.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      }
      
      setTimeout(() => {
        if (bg) bg.style.transition = '';
        if (icon) icon.style.transition = '';
      }, 250);
    });
  }
  
  destroy() {
    if (!this.active) return;
    if (this.panel) {
      this.panel.removeEventListener('mousemove', this.boundOnMouseMove);
      this.panel.removeEventListener('mouseleave', this.boundOnMouseLeave);
      this.panel.removeEventListener('mouseenter', this.boundCache);
    }
    window.removeEventListener('resize', this.boundCache);
    this.active = false;
  }
}

// Auto-initialize when headers are loaded via the headerLoaded event
document.addEventListener('headerLoaded', (e) => {
  const nav = document.querySelector('.header nav');
  if (nav) {
    window.headerDockInstance = new HeaderDock(nav);
  }
});

// Fallback: immediate check if header already loaded before script executed
(function() {
  const nav = document.querySelector('.header nav');
  if (nav) {
    window.headerDockInstance = new HeaderDock(nav);
  }
})();
