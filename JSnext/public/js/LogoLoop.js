/**
 * LogoLoop - Vanilla JS Component
 * 
 * Creates an infinitely scrolling, interactive horizontal ticker loop 
 * with hover scaling, edge fades, and deceleration/pausing on hover.
 */

class LogoLoop {
  constructor(element, options = {}) {
    if (!element) return;
    this.container = element;
    
    // Config Options
    this.speed = options.speed !== undefined ? options.speed : 60; // pixels per second
    this.direction = options.direction || 'left'; // 'left' or 'right'
    this.gap = options.gap !== undefined ? options.gap : 24;
    this.itemWidth = options.itemWidth !== undefined ? options.itemWidth : 340;
    this.hoverSpeed = options.hoverSpeed !== undefined ? options.hoverSpeed : 0; // Speed on hover
    this.scaleOnHover = options.scaleOnHover !== undefined ? options.scaleOnHover : true;
    this.fadeOut = options.fadeOut !== undefined ? options.fadeOut : true;
    
    this.offset = 0;
    this.velocity = 0;
    this.isHovered = false;
    
    this.rafId = null;
    this.lastTimestamp = null;
    
    this.init();
  }
  
  init() {
    // 1. Gather original cards
    const originalCards = Array.from(this.container.children);
    if (originalCards.length === 0) return;
    
    // Clear container
    this.container.innerHTML = '';
    
    // Set custom CSS variables on container
    this.container.style.setProperty('--logoloop-gap', `${this.gap}px`);
    this.container.style.setProperty('--logoloop-item-width', `${this.itemWidth}px`);
    
    // Add layout classes
    this.container.classList.add('logoloop');
    if (this.fadeOut) this.container.classList.add('logoloop--fade');
    if (this.scaleOnHover) this.container.classList.add('logoloop--scale-hover');
    
    // 2. Build track
    const track = document.createElement('div');
    track.className = 'logoloop__track';
    
    // 3. Build single list sequence
    const buildList = () => {
      const list = document.createElement('ul');
      list.className = 'logoloop__list';
      list.setAttribute('role', 'list');
      
      originalCards.forEach(card => {
        const item = document.createElement('li');
        item.className = 'logoloop__item';
        item.setAttribute('role', 'listitem');
        
        // Clone card with all children and event listeners
        const cardClone = card.cloneNode(true);
        item.appendChild(cardClone);
        list.appendChild(item);
      });
      
      return list;
    };
    
    const firstList = buildList();
    track.appendChild(firstList);
    this.container.appendChild(track);
    
    this.track = track;
    this.seqElement = firstList;
    
    // 4. Calculate copies needed based on width
    const updateCount = () => {
      const containerWidth = this.container.clientWidth || window.innerWidth;
      const sequenceWidth = this.seqElement.getBoundingClientRect().width || (originalCards.length * (this.itemWidth + this.gap));
      
      if (sequenceWidth > 0) {
        this.sequenceSize = sequenceWidth;
        const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + 2;
        
        // Clear all except the first list
        while (track.children.length > 1) {
          track.removeChild(track.lastChild);
        }
        
        // Add duplicate lists
        for (let i = 1; i < copiesNeeded; i++) {
          const listClone = buildList();
          listClone.setAttribute('aria-hidden', 'true');
          track.appendChild(listClone);
        }
      }
    };
    
    // Run initial copies calculation
    updateCount();
    
    // Recalculate copies on window resize
    this.boundResize = () => {
      updateCount();
    };
    window.addEventListener('resize', this.boundResize);
    
    // 5. Setup target velocities
    const directionMultiplier = this.direction === 'left' ? 1 : -1;
    this.targetVelocity = this.speed * directionMultiplier;
    this.velocity = this.targetVelocity;
    
    // 6. Hover triggers
    this.boundMouseEnter = () => {
      this.isHovered = true;
    };
    this.boundMouseLeave = () => {
      this.isHovered = false;
    };
    
    track.addEventListener('mouseenter', this.boundMouseEnter);
    track.addEventListener('mouseleave', this.boundMouseLeave);
    
    // 7. Start raf loop
    this.startLoop();
  }
  
  startLoop() {
    const smoothTau = 0.25; // Easing constant from React Bits animation config
    
    const animate = (timestamp) => {
      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
      }
      
      const deltaTime = Math.max(0, timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;
      
      // Determine target speed depending on hover state
      const target = this.isHovered ? this.hoverSpeed : this.targetVelocity;
      
      // Interpolate speed smoothly
      const easingFactor = 1 - Math.exp(-deltaTime / smoothTau);
      this.velocity += (target - this.velocity) * easingFactor;
      
      const seqSize = this.sequenceSize || 1000;
      
      // Update offset
      let nextOffset = this.offset + this.velocity * deltaTime;
      nextOffset = ((nextOffset % seqSize) + seqSize) % seqSize;
      this.offset = nextOffset;
      
      // Apply translation
      this.track.style.transform = `translate3d(${-this.offset}px, 0, 0)`;
      
      this.rafId = requestAnimationFrame(animate);
    };
    
    this.rafId = requestAnimationFrame(animate);
  }
  
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    window.removeEventListener('resize', this.boundResize);
    if (this.track) {
      this.track.removeEventListener('mouseenter', this.boundMouseEnter);
      this.track.removeEventListener('mouseleave', this.boundMouseLeave);
    }
  }
}

// Export class globally
window.LogoLoop = LogoLoop;
