/**
 * JobSarthi About Panel Physics Simulation
 * 
 * Implements a dynamic falling text physics simulation inside the dynamic 
 * rounded About panel card container using Matter.js. The effect triggers 
 * when the user shakes or moves their cursor quickly inside the panel.
 */

(function () {
  // Preload Matter.js from CDN as soon as this script is loaded
  if (!window.Matter && !document.getElementById('matterJsCDN')) {
    const script = document.createElement('script');
    script.id = 'matterJsCDN';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
    document.head.appendChild(script);
  }

  // Inject Custom Styles for physics overlay and warning label
  if (!document.getElementById('aboutPhysicsStyles')) {
    const style = document.createElement('style');
    style.id = 'aboutPhysicsStyles';
    style.textContent = `
      .about-warning-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-muted);
        opacity: 0.7;
        margin-bottom: 24px;
        text-align: center;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        animation: aboutWarningPulse 2s infinite ease-in-out;
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      @keyframes aboutWarningPulse {
        0%, 100% { opacity: 0.4; transform: scale(0.98); }
        50% { opacity: 0.8; transform: scale(1.02); }
      }
      .about-warning-label.active {
        color: var(--accent-secondary, #3b82f6);
        opacity: 0.9 !important;
        animation: none;
      }
      .falling-word-span {
        display: inline-block;
        white-space: nowrap;
        user-select: none;
        pointer-events: none;
        font-weight: inherit;
        font-size: inherit;
        color: inherit;
      }
      .falling-word-span.highlighted-word {
        background: linear-gradient(135deg, var(--accent-secondary, #3b82f6), var(--accent-tertiary, #6366f1));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
      }
      .about-physics-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  let physicsEngine = null;
  let physicsRunner = null;
  let physicsRender = null;
  let physicsAnimationFrame = null;
  let isPhysicsActive = false;
  let originalAboutHTML = null;

  // Walker function to wrap all words inside a DOM node in spans
  function wrapWordsInDOM(element) {
    const childNodes = Array.from(element.childNodes);
    childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim() === '') return;

        const words = text.split(/(\s+)/);
        const fragment = document.createDocumentFragment();

        words.forEach(word => {
          if (word.trim() === '') {
            fragment.appendChild(document.createTextNode(word));
          } else {
            const span = document.createElement('span');
            span.className = 'falling-word-span';
            span.textContent = word;
            
            // Apply highlight styling if appropriate
            if (element.classList.contains('highlight') || 
                word.toLowerCase().includes('matrix') || 
                word.toLowerCase().includes('minds')) {
              span.classList.add('highlighted-word');
            }
            fragment.appendChild(span);
          }
        });
        element.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Avoid mutating svg, button, or structural elements that should not fall
        if (node.tagName !== 'SCRIPT' && 
            node.tagName !== 'STYLE' && 
            node.tagName !== 'BUTTON' && 
            node.tagName !== 'SVG' && 
            node.id !== 'closeAboutBtn') {
          wrapWordsInDOM(node);
        }
      }
    });
  }

  // Initialize About panel interactions
  window.initAboutPhysics = function () {
    const container = document.getElementById('aboutContent');
    if (!container) return;

    const isHeaderEnabled = localStorage.getItem('dynamic_header_enabled') !== 'false' && localStorage.getItem('advanced_ui_enabled') !== 'false';
    const isFallingTextEnabled = localStorage.getItem('falling_text_enabled') !== 'false';
    if (!isHeaderEnabled || !isFallingTextEnabled) {
      return;
    }

    // Reset state and capture original HTML if not done already
    window.resetAboutPhysics();
    if (!originalAboutHTML) {
      originalAboutHTML = container.innerHTML;
    }

    // Add a small warning message at the top of the About box
    const warningLabel = document.createElement('div');
    warningLabel.className = 'about-warning-label';
    warningLabel.id = 'aboutWarningLabel';
    warningLabel.innerHTML = '⚠️ Do not shake the cursor';
    container.insertBefore(warningLabel, container.firstChild);

    // Setup mouse shake tracking inside the about box using distance comparison
    let mouseHistory = [];

    function detectCursorShake(e) {
      if (isPhysicsActive) return;

      const now = Date.now();
      mouseHistory.push({ x: e.clientX, y: e.clientY, t: now });
      
      // Maintain last 500ms history window
      mouseHistory = mouseHistory.filter(pt => now - pt.t < 500);
      
      if (mouseHistory.length < 10) return;
      
      // Calculate total accumulated path distance
      let totalDist = 0;
      for (let i = 1; i < mouseHistory.length; i++) {
        const dx = mouseHistory[i].x - mouseHistory[i-1].x;
        const dy = mouseHistory[i].y - mouseHistory[i-1].y;
        totalDist += Math.sqrt(dx * dx + dy * dy);
      }
      
      // Calculate straight line distance
      const oldest = mouseHistory[0];
      const newest = mouseHistory[mouseHistory.length - 1];
      const sLineDx = newest.x - oldest.x;
      const sLineDy = newest.y - oldest.y;
      const sLineDist = Math.sqrt(sLineDx * sLineDx + sLineDy * sLineDy);
      
      // Shaking gesture: high accumulated path, small net displacement
      if (totalDist > 250 && sLineDist < 70) {
        container.removeEventListener('mousemove', detectCursorShake);
        startFallingTextPhysics();
      }
    }

    container.addEventListener('mousemove', detectCursorShake);
    container._detectShake = detectCursorShake;
  };

  // Trigger the falling text simulation
  function startFallingTextPhysics() {
    if (!window.Matter) {
      console.warn("Matter.js is still loading. Retrying...");
      setTimeout(startFallingTextPhysics, 200);
      return;
    }

    const container = document.getElementById('aboutContent');
    const grid = container.querySelector('.about-grid');
    if (!container || !grid || isPhysicsActive) return;

    isPhysicsActive = true;

    // Hide warning label when physics is activated
    const warningLabel = document.getElementById('aboutWarningLabel');
    if (warningLabel) {
      warningLabel.style.opacity = '0';
      warningLabel.style.transform = 'translateY(-10px)';
      warningLabel.style.height = '0';
      warningLabel.style.marginBottom = '0';
      warningLabel.style.overflow = 'hidden';
      warningLabel.style.pointerEvents = 'none';
      warningLabel.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    // 1. Wrap all text nodes into .falling-word-span elements
    wrapWordsInDOM(grid);

    // 2. Measure all word absolute positions and capture original computed styles
    const spans = grid.querySelectorAll('.falling-word-span');
    const wordPositions = [];
    const containerRect = container.getBoundingClientRect();

    spans.forEach(span => {
      const rect = span.getBoundingClientRect();
      const computed = window.getComputedStyle(span);
      
      // Preserve exact original font weight, sizing, spacing, and styles inline
      span.style.fontSize = computed.fontSize;
      span.style.fontFamily = computed.fontFamily;
      span.style.fontWeight = computed.fontWeight;
      span.style.color = computed.color;
      span.style.textTransform = computed.textTransform;
      span.style.letterSpacing = computed.letterSpacing;
      span.style.textShadow = computed.textShadow;
      span.style.lineHeight = computed.lineHeight;
      
      wordPositions.push({
        element: span,
        width: rect.width,
        height: rect.height,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2
      });
    });

    // 3. Create absolute overlay for floating words and physics canvas
    const overlay = document.createElement('div');
    overlay.className = 'about-physics-overlay';
    overlay.id = 'aboutPhysicsOverlay';
    container.appendChild(overlay);

    // Make about content container relative so children position correctly
    container.style.position = 'relative';

    // 4. Move spans into the overlay at absolute coordinates
    wordPositions.forEach(wp => {
      wp.element.style.position = 'absolute';
      wp.element.style.left = `${wp.x}px`;
      wp.element.style.top = `${wp.y}px`;
      wp.element.style.transform = 'translate(-50%, -50%)';
      wp.element.style.margin = '0';
      wp.element.style.padding = '0';
      overlay.appendChild(wp.element);
    });

    // Hide original grid content layout
    grid.style.opacity = '0';
    grid.style.visibility = 'hidden';

    // 5. Initialize Matter.js Physics World
    const { Engine, Render, World, Bodies, Runner, Mouse, MouseConstraint } = window.Matter;

    const width = container.clientWidth;
    const height = container.clientHeight;

    physicsEngine = Engine.create();
    physicsEngine.world.gravity.y = 0.65; // Balanced, smooth gravity

    physicsRender = Render.create({
      element: overlay,
      engine: physicsEngine,
      options: {
        width: width,
        height: height,
        background: 'transparent',
        wireframes: false
      }
    });

    // 6. Create solid boundary walls (floor, walls, ceiling)
    const boundaryOptions = {
      isStatic: true,
      render: { fillStyle: 'transparent' }
    };
    // Position floor boundary exactly at the visible client bottom edge
    const floor = Bodies.rectangle(width / 2, height + 20, width, 40, boundaryOptions);
    const ceiling = Bodies.rectangle(width / 2, -20, width, 40, boundaryOptions);
    const leftWall = Bodies.rectangle(-20, height / 2, 40, height, boundaryOptions);
    const rightWall = Bodies.rectangle(width + 20, height / 2, 40, height, boundaryOptions);

    // 7. Create physical rectangle bodies matching each word span
    const wordBodies = wordPositions.map(wp => {
      const body = Bodies.rectangle(wp.x, wp.y, wp.width, wp.height, {
        restitution: 0.55,  // Satisfying bounce
        frictionAir: 0.015,
        friction: 0.1,
        render: { fillStyle: 'transparent' }
      });

      // Apply initial scatter impulse so they break apart dynamically
      window.Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 2 - 1.5
      });
      window.Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);

      return {
        element: wp.element,
        body: body
      };
    });

    // 8. Bind mouse cursor interaction (kicking/dragging words)
    const mouse = Mouse.create(container);
    const mouseConstraint = MouseConstraint.create(physicsEngine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.7,
        render: { visible: false }
      }
    });
    physicsRender.mouse = mouse;

    // Add everything to the physics world
    World.add(physicsEngine.world, [
      floor, ceiling, leftWall, rightWall,
      mouseConstraint,
      ...wordBodies.map(wb => wb.body)
    ]);

    physicsRunner = Runner.create();
    Runner.run(physicsRunner, physicsEngine);
    Render.run(physicsRender);

    // 9. Physics loop to match DOM elements to simulated Matter.js coordinates
    const updatePhysicsLoop = () => {
      if (!isPhysicsActive) return;

      wordBodies.forEach(({ body, element }) => {
        const { x, y } = body.position;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
      });

      physicsAnimationFrame = requestAnimationFrame(updatePhysicsLoop);
    };

    updatePhysicsLoop();
  }

  // Terminate simulation, clear memory, and restore normal state
  window.resetAboutPhysics = function () {
    isPhysicsActive = false;

    // Cancel animation frames
    if (physicsAnimationFrame) {
      cancelAnimationFrame(physicsAnimationFrame);
      physicsAnimationFrame = null;
    }

    // Stop Matter.js engine parts
    if (physicsRunner) {
      window.Matter.Runner.stop(physicsRunner);
      physicsRunner = null;
    }
    if (physicsRender) {
      window.Matter.Render.stop(physicsRender);
      physicsRender = null;
    }
    if (physicsEngine) {
      window.Matter.World.clear(physicsEngine.world);
      window.Matter.Engine.clear(physicsEngine);
      physicsEngine = null;
    }

    const container = document.getElementById('aboutContent');
    if (!container) return;

    // Remove shake event listener
    if (container._detectShake) {
      container.removeEventListener('mousemove', container._detectShake);
      container._detectShake = null;
    }

    // Remove overlays
    const overlay = document.getElementById('aboutPhysicsOverlay');
    if (overlay) {
      overlay.parentNode.removeChild(overlay);
    }

    // Restore original unmodified HTML content to make it perfectly normal
    if (originalAboutHTML) {
      container.innerHTML = originalAboutHTML;
      container.style.position = '';
    }
  };
})();
