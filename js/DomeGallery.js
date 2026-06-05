/**
 * DomeGallery - Vanilla JS 3D Cylinder Gallery Component
 * 
 * Renders a 3D spherical dome of images with horizontal drag/touch
 * navigation, physics-based inertia spin, and hover badges.
 */

class DomeGallery {
  constructor(element, options = {}) {
    if (!element) return;
    this.container = element;
    
    this.images = options.images || [];
    this.segments = options.segments || 24;
    this.radius = options.radius || 320;
    
    // Physics & Interaction options
    this.dragSensitivity = options.dragSensitivity || 0.15;
    this.dragDampening = options.dragDampening || 0.94; // inertia friction multiplier
    this.autoRotateSpeed = options.autoRotateSpeed !== undefined ? options.autoRotateSpeed : 0.05; // deg per frame on idle
    
    // Rotation state
    this.rotY = 0;
    this.rotX = 0;
    
    // Interaction states
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.startRotY = 0;
    this.startRotX = 0;
    this.velocityY = 0;
    this.velocityX = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.lastTime = 0;
    
    this.rafId = null;
    this.init();
  }
  
  init() {
    this.container.classList.add('sphere-root');
    this.container.style.setProperty('--segments-x', this.segments);
    this.container.style.setProperty('--segments-y', this.segments);
    
    const items = this.buildItems();
    
    // Build HTML DOM Structure
    this.container.innerHTML = `
      <main class="sphere-main">
        <div class="stage">
          <div class="sphere" style="transform: translateZ(calc(var(--radius) * -1)) rotateX(0deg) rotateY(0deg);">
            ${items.map((it, i) => `
              <div class="item" 
                   data-offset-x="${it.x}" 
                   data-offset-y="${it.y}" 
                   data-size-x="${it.sizeX}" 
                   data-size-y="${it.sizeY}"
                   style="--offset-x: ${it.x}; --offset-y: ${it.y}; --item-size-x: ${it.sizeX}; --item-size-y: ${it.sizeY};">
                <div class="item__image" role="button" tabIndex="0" aria-label="${it.alt}">
                  <img src="${it.src}" draggable="false" alt="${it.alt}">
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="overlay"></div>
        <div class="overlay overlay--blur"></div>
        <div class="edge-fade edge-fade--top"></div>
        <div class="edge-fade edge-fade--bottom"></div>
      </main>
    `;
    
    this.sphere = this.container.querySelector('.sphere');
    
    // Bind event handlers
    this.bindEvents();
    
    // Start animation loop
    this.startLoop();
  }
  
  buildItems() {
    // Distribute images on a cylindrical dome grid
    // segments = 24
    const cols = this.segments;
    const evenYs = [-1.5, 0, 1.5];
    const oddYs = [-0.75, 0.75];
    
    const items = [];
    let imgIdx = 0;
    
    for (let c = 0; c < cols; c++) {
      const ys = (c % 2 === 0) ? evenYs : oddYs;
      ys.forEach(y => {
        if (this.images.length === 0) return;
        const src = this.images[imgIdx % this.images.length];
        items.push({
          x: -cols + c * 2,
          y: y * 2.2,
          sizeX: 2,
          sizeY: 2,
          src: src,
          alt: 'Employer Badge'
        });
        imgIdx++;
      });
    }
    return items;
  }
  
  bindEvents() {
    this.boundOnStart = this.onStart.bind(this);
    this.boundOnMove = this.onMove.bind(this);
    this.boundOnEnd = this.onEnd.bind(this);
    
    // Mouse listeners
    this.container.addEventListener('mousedown', this.boundOnStart, { passive: false });
    window.addEventListener('mousemove', this.boundOnMove, { passive: false });
    window.addEventListener('mouseup', this.boundOnEnd, { passive: false });
    
    // Touch listeners
    this.container.addEventListener('touchstart', this.boundOnStart, { passive: false });
    window.addEventListener('touchmove', this.boundOnMove, { passive: false });
    window.addEventListener('touchend', this.boundOnEnd, { passive: false });
  }
  
  getCoords(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }
  
  onStart(e) {
    // Don't intercept clicks inside buttons/inputs if we have any
    if (e.target.closest('button, a, input')) return;
    
    e.preventDefault();
    this.isDragging = true;
    
    const coords = this.getCoords(e);
    this.startX = coords.x;
    this.startY = coords.y;
    this.lastX = coords.x;
    this.lastY = coords.y;
    this.lastTime = performance.now();
    
    this.startRotY = this.rotY;
    this.startRotX = this.rotX;
    
    this.velocityY = 0;
    this.velocityX = 0;
  }
  
  onMove(e) {
    if (!this.isDragging) return;
    
    const coords = this.getCoords(e);
    const now = performance.now();
    const dt = Math.max(1, now - this.lastTime);
    
    const dx = coords.x - this.startX;
    const dy = coords.y - this.startY;
    
    // Calculate instantaneous velocity for inertia
    this.velocityY = ((coords.x - this.lastX) / dt) * 16.66; // pixels per frame
    this.velocityX = ((coords.y - this.lastY) / dt) * 16.66;
    
    this.lastX = coords.x;
    this.lastY = coords.y;
    this.lastTime = now;
    
    // Update rotations (Y-axis swipe rotates around Y-axis)
    this.rotY = this.startRotY + dx * this.dragSensitivity;
    this.rotX = Math.min(Math.max(this.startRotX - dy * this.dragSensitivity * 0.5, -12), 12);
    
    this.applyTransform();
  }
  
  onEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
  }
  
  applyTransform() {
    if (this.sphere) {
      this.sphere.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${this.rotX}deg) rotateY(${this.rotY}deg)`;
    }
  }
  
  startLoop() {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      
      if (!this.isDragging) {
        // Apply inertia dampening
        if (Math.abs(this.velocityY) > 0.05) {
          this.rotY += this.velocityY * 0.08;
          this.velocityY *= this.dragDampening;
        } else {
          // Slow constant auto-rotation on idle
          this.rotY += this.autoRotateSpeed;
        }
        
        if (Math.abs(this.velocityX) > 0.05) {
          this.rotX = Math.min(Math.max(this.rotX - this.velocityX * 0.04, -12), 12);
          this.velocityX *= this.dragDampening;
        } else {
          // Return to level horizon on idle
          this.rotX += (0 - this.rotX) * 0.05;
        }
        
        this.applyTransform();
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }
  
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.container.removeEventListener('mousedown', this.boundOnStart);
    window.removeEventListener('mousemove', this.boundOnMove);
    window.removeEventListener('mouseup', this.boundOnEnd);
    
    this.container.removeEventListener('touchstart', this.boundOnStart);
    window.removeEventListener('touchmove', this.boundOnMove);
    window.removeEventListener('touchend', this.boundOnEnd);
  }
}

// Export to window
window.DomeGallery = DomeGallery;
