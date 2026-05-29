/**
 * SplitText - Vanilla JS Component
 * 
 * Splits target text into characters/words and animates them with GSAP/ScrollTrigger.
 */

class SplitText {
  constructor(element, options = {}) {
    if (!element) return;
    this.element = element;
    this.text = options.text || element.textContent.trim();
    this.className = options.className || '';
    this.delay = options.delay !== undefined ? options.delay : 50;
    this.duration = options.duration !== undefined ? options.duration : 1.25;
    this.ease = options.ease || 'power3.out';
    this.splitType = options.splitType || 'chars';
    this.from = options.from || { opacity: 0, y: 40 };
    this.to = options.to || { opacity: 1, y: 0 };
    this.threshold = options.threshold !== undefined ? options.threshold : 0.1;
    this.rootMargin = options.rootMargin || '-100px';
    this.textAlign = options.textAlign || 'center';
    this.onLetterAnimationComplete = options.onLetterAnimationComplete;
    
    this.targets = [];
    this.init();
  }
  
  init() {
    this.element.style.textAlign = this.textAlign;
    this.element.style.overflow = 'hidden';
    this.element.style.display = 'inline-block';
    this.element.style.whiteSpace = 'normal';
    this.element.style.wordWrap = 'break-word';
    this.element.style.willChange = 'transform, opacity';
    if (this.className) {
      this.element.classList.add(...this.className.split(' ').filter(Boolean));
    }
    
    // Clear and split
    this.element.innerHTML = '';
    
    const words = this.text.split(/\s+/);
    
    words.forEach((word, wordIndex) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'split-word';
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';
      
      if (this.splitType.includes('chars')) {
        const letters = word.split('');
        letters.forEach(letter => {
          const letterSpan = document.createElement('span');
          letterSpan.className = 'split-char';
          letterSpan.style.display = 'inline-block';
          letterSpan.style.willChange = 'transform, opacity';
          letterSpan.textContent = letter;
          wordSpan.appendChild(letterSpan);
          this.targets.push(letterSpan);
        });
      } else {
        wordSpan.style.willChange = 'transform, opacity';
        wordSpan.textContent = word;
        this.targets.push(wordSpan);
      }
      
      this.element.appendChild(wordSpan);
      
      if (wordIndex < words.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.style.display = 'inline-block';
        spaceSpan.innerHTML = '&nbsp;';
        this.element.appendChild(spaceSpan);
      }
    });
    
    // Animate using GSAP
    if (typeof gsap !== 'undefined') {
      if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
      }
      const startPct = (1 - this.threshold) * 100;
      
      // Build ScrollTrigger configuration if plugin is registered
      let scrollTriggerConfig = null;
      if (gsap.plugins && gsap.plugins.scrollTrigger) {
        const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(this.rootMargin);
        const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
        const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
        const sign = marginValue === 0 ? '' : (marginValue < 0 ? `-=${Math.abs(marginValue)}${marginUnit}` : `+=${marginValue}${marginUnit}`);
        const start = `top ${startPct}%${sign}`;
        
        scrollTriggerConfig = {
          trigger: this.element,
          start: start,
          once: true,
          fastScrollEnd: true,
          anticipatePin: 0.4
        };
      }
      
      gsap.fromTo(this.targets, this.from, {
        ...this.to,
        duration: this.duration,
        ease: this.ease,
        stagger: this.delay / 1000,
        scrollTrigger: scrollTriggerConfig,
        onComplete: () => {
          if (this.onLetterAnimationComplete) {
            this.onLetterAnimationComplete();
          }
        }
      });
    }
  }
}

// Export to window object for global availability
window.SplitText = SplitText;
