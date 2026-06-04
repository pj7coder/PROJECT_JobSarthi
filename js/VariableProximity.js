/**
 * VariableProximity - Vanilla JS Component
 * 
 * Adjusts font variation settings of individual text characters based on proximity to the cursor.
 */

class VariableProximity {
  constructor(element, options = {}) {
    if (!element) return;
    this.element = element;
    
    // Configurable options
    this.container = options.container || element.closest('.hero-left') || element.parentElement;
    this.fromFontVariationSettings = options.fromFontVariationSettings || "'wght' 400, 'opsz' 9";
    this.toFontVariationSettings = options.toFontVariationSettings || "'wght' 800, 'opsz' 40";
    this.radius = options.radius !== undefined ? options.radius : 50;
    this.falloff = options.falloff || 'linear';
    
    this.mousePosition = { x: -9999, y: -9999 }; // Start far away to avoid initial jump
    this.lastPosition = { x: null, y: null };
    this.letterRefs = [];
    this.parsedSettings = [];
    this.active = false;
    
    this.init();
  }
  
  init() {
    this.element.classList.add('variable-proximity');
    
    // Parse target variation settings
    this.parsedSettings = this.parseSettings(this.fromFontVariationSettings, this.toFontVariationSettings);
    
    // Select existing chars if already split, or split them now
    let chars = this.element.querySelectorAll('.split-char, .proximity-char');
    if (chars.length > 0) {
      this.letterRefs = Array.from(chars);
    } else {
      // Manual splitting if no pre-split characters exist
      const label = this.element.textContent.trim();
      this.element.innerHTML = '';
      
      const words = label.split(/\s+/);
      
      words.forEach((word, wordIndex) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'proximity-word';
        wordSpan.style.display = 'inline-block';
        wordSpan.style.whiteSpace = 'nowrap';
        
        const letters = word.split('');
        letters.forEach(letter => {
          const letterSpan = document.createElement('span');
          letterSpan.className = 'proximity-char';
          letterSpan.style.display = 'inline-block';
          letterSpan.style.fontVariationSettings = this.fromFontVariationSettings;
          letterSpan.textContent = letter;
          wordSpan.appendChild(letterSpan);
          this.letterRefs.push(letterSpan);
        });
        
        this.element.appendChild(wordSpan);
        
        if (wordIndex < words.length - 1) {
          const spaceSpan = document.createElement('span');
          spaceSpan.style.display = 'inline-block';
          spaceSpan.innerHTML = '&nbsp;';
          this.element.appendChild(spaceSpan);
        }
      });
    }
    
    // Event listeners for mouse and touch positioning
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    
    window.addEventListener('mousemove', this.boundHandleMouseMove, { passive: true });
    window.addEventListener('touchmove', this.boundHandleTouchMove, { passive: true });
    
    this.active = true;
    this.loop();
  }
  
  parseSettings(fromStr, toStr) {
    const parse = settingsStr => {
      const map = new Map();
      settingsStr.split(',').forEach(s => {
        const trimmed = s.trim();
        if (!trimmed) return;
        const firstSpace = trimmed.indexOf(' ');
        if (firstSpace === -1) return;
        const name = trimmed.substring(0, firstSpace).replace(/['"]/g, '');
        const value = parseFloat(trimmed.substring(firstSpace + 1));
        map.set(name, value);
      });
      return map;
    };

    const fromSettings = parse(fromStr);
    const toSettings = parse(toStr);

    return Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
      axis,
      fromValue,
      toValue: toSettings.has(axis) ? toSettings.get(axis) : fromValue
    }));
  }
  
  updatePosition(clientX, clientY) {
    if (this.container) {
      const rect = this.container.getBoundingClientRect();
      this.mousePosition = { x: clientX - rect.left, y: clientY - rect.top };
    } else {
      this.mousePosition = { x: clientX, y: clientY };
    }
  }
  
  handleMouseMove(ev) {
    this.updatePosition(ev.clientX, ev.clientY);
  }
  
  handleTouchMove(ev) {
    if (ev.touches && ev.touches[0]) {
      const touch = ev.touches[0];
      this.updatePosition(touch.clientX, touch.clientY);
    }
  }
  
  calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  
  calculateFalloff(distance) {
    const norm = Math.min(Math.max(1 - distance / this.radius, 0), 1);
    switch (this.falloff) {
      case 'exponential':
        return norm ** 2;
      case 'gaussian':
        return Math.exp(-((distance / (this.radius / 2)) ** 2) / 2);
      case 'linear':
      default:
        return norm;
    }
  }
  
  loop() {
    if (!this.active) return;
    
    requestAnimationFrame(() => this.loop());
    
    if (!this.container || document.body.classList.contains('about-active')) return;
    const containerRect = this.container.getBoundingClientRect();
    const { x, y } = this.mousePosition;
    
    if (this.lastPosition.x === x && this.lastPosition.y === y) {
      return;
    }
    this.lastPosition = { x, y };
    
    this.letterRefs.forEach(letterRef => {
      if (!letterRef) return;
      
      const rect = letterRef.getBoundingClientRect();
      // Calculate letter center position relative to the container
      const letterCenterX = rect.left + rect.width / 2 - containerRect.left;
      const letterCenterY = rect.top + rect.height / 2 - containerRect.top;
      
      const distance = this.calculateDistance(x, y, letterCenterX, letterCenterY);
      
      if (distance >= this.radius) {
        letterRef.style.fontVariationSettings = this.fromFontVariationSettings;
        return;
      }
      
      const falloffValue = this.calculateFalloff(distance);
      const newSettings = this.parsedSettings
        .map(({ axis, fromValue, toValue }) => {
          const interpolatedValue = fromValue + (toValue - fromValue) * falloffValue;
          return `'${axis}' ${interpolatedValue}`;
        })
        .join(', ');
        
      letterRef.style.fontVariationSettings = newSettings;
    });
  }
  
  destroy() {
    this.active = false;
    window.removeEventListener('mousemove', this.boundHandleMouseMove);
    window.removeEventListener('touchmove', this.boundHandleTouchMove);
  }
}

// Export to window object for global availability
window.VariableProximity = VariableProximity;
