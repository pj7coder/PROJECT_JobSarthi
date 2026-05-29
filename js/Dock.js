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
    this.baseWidth = options.baseWidth || 115;
    this.baseHeight = options.baseHeight || 32;
    this.magnifiedWidth = options.magnifiedWidth || 145;
    this.magnifiedHeight = options.magnifiedHeight || 36;
    this.distance = options.distance || 120;
    this.active = false;
    
    this.transformNav();
  }
  
  transformNav() {
    // 1. Identify container structures
    const navLinksList = this.nav.querySelector('.nav-links');
    if (!navLinksList) return;
    
    // Find all anchors inside list items
    const anchors = Array.from(navLinksList.querySelectorAll('a.nav-link'));
    if (anchors.length === 0) return;
    
    // Create new pill-shape panel
    const panel = document.createElement('div');
    panel.className = 'dock-panel';
    
    // Map original anchors and update contents in place to preserve listeners
    anchors.forEach(a => {
      const labelText = a.textContent.trim();
      const key = labelText.toLowerCase();
      const iconSvg = DOCK_ICON_MAP[key] || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
      
      // Update element layout
      a.className = a.classList.contains('active') ? 'dock-item active' : 'dock-item';
      a.innerHTML = `
        <span class="dock-icon">${iconSvg}</span>
        <span class="dock-name">${labelText}</span>
      `;
      
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
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    
    this.panel.addEventListener('mousemove', this.boundOnMouseMove, { passive: true });
    this.panel.addEventListener('mouseleave', this.boundOnMouseLeave, { passive: true });
    
    this.resetSizes();
    this.active = true;
  }
  
  onMouseMove(e) {
    const mouseX = e.clientX;
    
    this.items.forEach(item => {
      const rect = item.getBoundingClientRect();
      const itemCenterX = rect.left + rect.width / 2;
      const dist = Math.abs(mouseX - itemCenterX);
      
      if (dist < this.distance) {
        const factor = 1 - (dist / this.distance); // 0 to 1
        const smoothFactor = Math.sin(factor * Math.PI / 2); // Cosine easing
        
        const width = this.baseWidth + (this.magnifiedWidth - this.baseWidth) * smoothFactor;
        const height = this.baseHeight + (this.magnifiedHeight - this.baseHeight) * smoothFactor;
        
        item.style.width = `${width}px`;
        item.style.height = `${height}px`;
      } else {
        item.style.width = `${this.baseWidth}px`;
        item.style.height = `${this.baseHeight}px`;
      }
    });
  }
  
  onMouseLeave() {
    this.resetSizes();
  }
  
  resetSizes() {
    this.items.forEach(item => {
      item.style.width = `${this.baseWidth}px`;
      item.style.height = `${this.baseHeight}px`;
      item.style.transition = 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      
      // Remove quick transition after returning to base size
      setTimeout(() => {
        item.style.transition = '';
      }, 250);
    });
  }
  
  destroy() {
    if (!this.active) return;
    this.panel.removeEventListener('mousemove', this.boundOnMouseMove);
    this.panel.removeEventListener('mouseleave', this.boundOnMouseLeave);
  }
}

// Auto-initialize when headers are loaded via the headerLoaded event
document.addEventListener('headerLoaded', (e) => {
  const nav = document.querySelector('.header nav');
  if (nav) {
    new HeaderDock(nav);
  }
});

// Fallback: immediate check if header already loaded before script executed
(function() {
  const nav = document.querySelector('.header nav');
  if (nav) {
    new HeaderDock(nav);
  }
})();
