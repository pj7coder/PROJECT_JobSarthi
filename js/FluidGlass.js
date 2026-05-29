/**
 * FluidGlass Cursor component - Vanilla JS + CSS implementation
 * 
 * Replicates the visual qualities of a refracting 3D Glass Lens cursor
 * including spring physics follow, chromatic aberration shadows, specular sheens,
 * motion scaling/stretching, and backdrop-filter refraction.
 */

(function () {
  // Inject Premium CSS styles for Fluid Glass Lens
  if (!document.getElementById('fluidGlassStyles')) {
    const style = document.createElement('style');
    style.id = 'fluidGlassStyles';
    style.textContent = `
      .fluid-glass-lens {
        position: fixed;
        top: 0;
        left: 0;
        width: 85px;
        height: 85px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 999999;
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.3);
        transform-origin: center center;
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        
        /* High ior (Index of Refraction) glass visual depth & 0x5227ff Clear Tint */
        border: 1px solid rgba(255, 255, 255, 0.4);
        background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.18) 0%, rgba(82, 39, 255, 0.08) 50%, rgba(82, 39, 255, 0.03) 100%);
        
        /* Refracting Glass Blur and Saturation multiplier */
        backdrop-filter: blur(5px) saturate(180%) contrast(105%);
        -webkit-backdrop-filter: blur(5px) saturate(180%) contrast(105%);
        
        /* Thickness: 5 Glass Edge Shadows and Inner Specular Highlights */
        box-shadow: 
          inset 0 0 25px 4px rgba(255, 255, 255, 0.35),
          inset 0 0 10px 1px rgba(82, 39, 255, 0.25),
          0 0 0 2px rgba(255, 255, 255, 0.25),
          0 15px 35px rgba(0, 0, 0, 0.3),
          0 5px 15px rgba(82, 39, 255, 0.15);
        will-change: left, top, transform;
      }
      
      body.light-theme .fluid-glass-lens {
        border-color: rgba(0, 0, 0, 0.18);
        background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.3) 0%, rgba(82, 39, 255, 0.06) 55%, rgba(82, 39, 255, 0.02) 100%);
        backdrop-filter: blur(5px) saturate(160%) contrast(98%);
        -webkit-backdrop-filter: blur(5px) saturate(160%) contrast(98%);
        box-shadow: 
          inset 0 0 25px 4px rgba(255, 255, 255, 0.85),
          inset 0 0 10px 1px rgba(82, 39, 255, 0.12),
          0 0 0 2px rgba(0, 0, 0, 0.08),
          0 12px 28px rgba(0, 0, 0, 0.12),
          0 4px 12px rgba(82, 39, 255, 0.06);
      }

      /* Specular Light Reflection sheen */
      .fluid-glass-lens::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 45%);
        pointer-events: none;
        transform: translate(var(--sheen-x, 0px), var(--sheen-y, 0px));
        will-change: transform;
      }
      
      body.light-theme .fluid-glass-lens::after {
        background: radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 45%);
      }

      /* Chromatic Aberration 0.1 split red/cyan shadows on high speed */
      .fluid-glass-lens::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        pointer-events: none;
        opacity: var(--aberration-opacity, 0);
        box-shadow: 
          calc(var(--aberration-offset-x, 0px) * -1) calc(var(--aberration-offset-y, 0px) * -1) 3px rgba(255, 75, 75, 0.6),
          var(--aberration-offset-x, 0px) var(--aberration-offset-y, 0px) 3px rgba(34, 211, 238, 0.6);
        will-change: opacity;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize lens DOM element
  let lens = document.getElementById('fluidGlassLens');
  if (!lens) {
    lens = document.createElement('div');
    lens.id = 'fluidGlassLens';
    lens.className = 'fluid-glass-lens';
    document.body.appendChild(lens);
  }

  // State configurations
  window.FluidGlassConfig = {
    ENABLED: localStorage.getItem('fluid_glass_enabled') !== 'false',
    SLIDER_VAL: parseFloat(localStorage.getItem('fluid_glass_radius_slider') || '5')
  };

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let currentX = mouseX;
  let currentY = mouseY;
  let vx = 0;
  let vy = 0;
  let animFrameId = null;
  let isMoving = false;
  let fadeTimeout = null;

  // Tracker events
  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    if (window.FluidGlassConfig.ENABLED) {
      lens.style.opacity = '1';
    }
    
    // Keep visible on motion, reset fade out timer when stationary
    isMoving = true;
    clearTimeout(fadeTimeout);
    fadeTimeout = setTimeout(() => {
      isMoving = false;
    }, 1500);
  }

  function onMouseLeave() {
    lens.style.opacity = '0';
  }

  function onMouseEnter() {
    if (window.FluidGlassConfig.ENABLED) {
      lens.style.opacity = '1';
    }
  }

  // Spring physics render loop
  function physicsRenderLoop() {
    if (!window.FluidGlassConfig.ENABLED) {
      lens.style.opacity = '0';
      animFrameId = null;
      return;
    }

    // Spring calculation equations
    const dx = mouseX - currentX;
    const dy = mouseY - currentY;

    // K = 0.16 (stiffness), D = 0.72 (damping)
    const ax = dx * 0.16;
    const ay = dy * 0.16;

    vx = (vx + ax) * 0.72;
    vy = (vy + ay) * 0.72;

    currentX += vx;
    currentY += vy;

    const speed = Math.sqrt(vx * vx + vy * vy);

    // Apply fluid warp stretch based on speed vector
    const stretch = Math.min(1 + speed * 0.012, 1.35);
    const squash = Math.max(1 - speed * 0.007, 0.8);
    const angle = Math.atan2(vy, vx);

    // Update coordinates and 3D squash transformations
    lens.style.left = `${currentX}px`;
    lens.style.top = `${currentY}px`;
    lens.style.transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${stretch}, ${squash})`;

    // Specular sheen shift based on lag vector
    lens.style.setProperty('--sheen-x', `${-vx * 0.28}px`);
    lens.style.setProperty('--sheen-y', `${-vy * 0.28}px`);

    // Chromatic aberration opacity and displacement offset
    if (speed > 3) {
      lens.style.setProperty('--aberration-opacity', Math.min((speed - 3) * 0.07, 0.65));
      lens.style.setProperty('--aberration-offset-x', `${vx * 0.15}px`);
      lens.style.setProperty('--aberration-offset-y', `${vy * 0.15}px`);
    } else {
      lens.style.setProperty('--aberration-opacity', '0');
    }

    animFrameId = requestAnimationFrame(physicsRenderLoop);
  }

  // Global settings control hooks
  window.toggleFluidGlass = function (enabled) {
    window.FluidGlassConfig.ENABLED = enabled;
    localStorage.setItem('fluid_glass_enabled', enabled ? 'true' : 'false');

    // Toggle slider display visibility for all header dropdown panels
    const radiusOptions = document.querySelectorAll('#fluidGlassRadiusOption');
    radiusOptions.forEach(opt => {
      opt.style.display = enabled ? 'flex' : 'none';
    });

    // Synchronize checkboxes
    const checkboxes = document.querySelectorAll('#fluidGlassToggleCheckbox');
    checkboxes.forEach(cb => {
      if (cb.checked !== enabled) {
        cb.checked = enabled;
      }
    });

    if (enabled) {
      lens.style.opacity = '1';
      if (!animFrameId) {
        physicsRenderLoop();
      }
    } else {
      lens.style.opacity = '0';
    }
  };

  window.updateFluidGlassRadius = function (val) {
    const sliderVal = parseFloat(val);
    // Diameter ranges from 37px (at level 1) to 145px (at level 10)
    const diameter = sliderVal * 12 + 25;
    
    window.FluidGlassConfig.SLIDER_VAL = sliderVal;
    localStorage.setItem('fluid_glass_radius_slider', val);
    localStorage.setItem('fluid_glass_radius_diameter', diameter);

    // Sync all labels
    const radiusLabels = document.querySelectorAll('#fluidGlassRadiusVal');
    radiusLabels.forEach(label => {
      label.textContent = sliderVal.toFixed(0);
    });

    // Sync all sliders
    const radiusSliders = document.querySelectorAll('#fluidGlassRadiusSlider');
    radiusSliders.forEach(slider => {
      if (parseFloat(slider.value) !== sliderVal) {
        slider.value = val;
      }
    });

    // Apply diameter sizing
    lens.style.width = `${diameter}px`;
    lens.style.height = `${diameter}px`;
  };

  // Bind mouse coordinates listeners
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseleave', onMouseLeave, { passive: true });
  window.addEventListener('mouseenter', onMouseEnter, { passive: true });

  // Initialize and run on script load
  const savedVal = localStorage.getItem('fluid_glass_radius_slider') || '5';
  window.updateFluidGlassRadius(savedVal);

  if (window.FluidGlassConfig.ENABLED) {
    physicsRenderLoop();
  } else {
    lens.style.opacity = '0';
  }
})();
