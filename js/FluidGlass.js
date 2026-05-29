/**
 * FluidGlass Cursor component - Vanilla JS + CSS implementation
 * 
 * Replicates the visual qualities of a refracting 3D Glass Lens cursor
 * including spring physics follow, chromatic aberration shadows, specular sheens,
 * motion scaling/stretching, and backdrop-filter refraction.
 */

(function () {
  // 1. Generate 256x256 Spherical Displacement Map Texture for genuine 3D Refraction
  function generateDisplacementMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(256, 256);
    const data = imgData.data;

    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const idx = (y * 256 + x) * 4;
        const dx = x - 128;
        const dy = y - 128;
        const r = Math.sqrt(dx * dx + dy * dy);

        if (r < 128) {
          // Spherical refraction profile - curves backdrop pixels inward to magnify/refract
          const factor = Math.sin((r / 128) * Math.PI);
          const rx = 128 + (dx / r) * factor * 127;
          const ry = 128 + (dy / r) * factor * 127;

          data[idx] = Math.max(0, Math.min(255, rx));     // Red channel handles X displacement
          data[idx + 1] = Math.max(0, Math.min(255, ry)); // Green channel handles Y displacement
          data[idx + 2] = 0;                              // Blue unused
          data[idx + 3] = 255;                            // Alpha
        } else {
          // Neutral grey outside the boundary (zero displacement)
          data[idx] = 128;
          data[idx + 1] = 128;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }

  // 2. Inject SVG displacement filter definition into body
  if (!document.getElementById('fluidGlassSvgFilter')) {
    const mapDataUrl = generateDisplacementMap();
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.id = 'fluidGlassSvgFilter';
    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.pointerEvents = "none";
    
    svg.innerHTML = `
      <defs>
        <filter id="fluidGlassRefraction" x="-30%" y="-30%" width="160%" height="160%">
          <feImage id="fluidGlassMapImg" href="${mapDataUrl}" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="35" xChannelSelector="R" yChannelSelector="G" result="refracted" />
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);
  }

  // 3. Inject Premium CSS styles for Fluid Glass Lens
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
        
        /* Realistic 3D glass sphere gradient (specular high to shadow drop edge) */
        border: 1.5px solid rgba(255, 255, 255, 0.45);
        background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.28) 0%, rgba(82, 39, 255, 0.15) 35%, rgba(0, 0, 0, 0.35) 75%, rgba(0, 0, 0, 0.75) 100%);
        
        /* Premium hardware-accelerated 3D spherical displacement backdrop refraction */
        backdrop-filter: url(#fluidGlassRefraction) blur(1px) saturate(180%) contrast(105%);
        -webkit-backdrop-filter: url(#fluidGlassRefraction) blur(1px) saturate(180%) contrast(105%);
        
        /* Thickness 5 profile: thick glass rim inset, neon Fresnel ring, deep projection shadow */
        box-shadow: 
          inset 0 0 20px 3px rgba(255, 255, 255, 0.4),
          inset -10px -10px 25px rgba(0, 0, 0, 0.75),
          0 0 0 1px rgba(82, 39, 255, 0.3),
          0 20px 45px rgba(0, 0, 0, 0.45),
          0 4px 15px rgba(82, 39, 255, 0.2);
        will-change: left, top, transform;
      }
      
      body.light-theme .fluid-glass-lens {
        border-color: rgba(0, 0, 0, 0.18);
        background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.45) 0%, rgba(82, 39, 255, 0.1) 40%, rgba(0, 0, 0, 0.15) 75%, rgba(0, 0, 0, 0.4) 100%);
        backdrop-filter: url(#fluidGlassRefraction) blur(1px) saturate(160%) contrast(98%);
        -webkit-backdrop-filter: url(#fluidGlassRefraction) blur(1px) saturate(160%) contrast(98%);
        box-shadow: 
          inset 0 0 20px 3px rgba(255, 255, 255, 0.8),
          inset -10px -10px 25px rgba(0, 0, 0, 0.25),
          0 0 0 1px rgba(82, 39, 255, 0.15),
          0 15px 32px rgba(0, 0, 0, 0.15),
          0 4px 12px rgba(82, 39, 255, 0.08);
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
          calc(var(--aberration-offset-x, 0px) * -1.2) calc(var(--aberration-offset-y, 0px) * -1.2) 3px rgba(255, 75, 75, 0.65),
          calc(var(--aberration-offset-x, 0px) * 1.2) calc(var(--aberration-offset-y, 0px) * 1.2) 3px rgba(34, 211, 238, 0.65);
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

  let currentAngle = 0;
  let currentStretch = 1;
  let currentSquash = 1;

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

    // Apply fluid warp stretch based on speed vector with smooth lerp interpolation
    let targetStretch = 1;
    let targetSquash = 1;
    let targetAngle = currentAngle;

    if (speed > 0.15) {
      targetStretch = Math.min(1 + speed * 0.012, 1.35);
      targetSquash = Math.max(1 - speed * 0.007, 0.8);
      targetAngle = Math.atan2(vy, vx);
    } else {
      // Return to base circular form and orientation when speed approaches 0
      targetStretch = 1;
      targetSquash = 1;
      targetAngle = 0;
    }

    // Normalize angle difference to prevent spinning around the long way
    let angleDiff = targetAngle - currentAngle;
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    // Linear interpolate to smooth out any tiny visual jitters or snaps
    currentAngle += angleDiff * 0.15;
    currentStretch += (targetStretch - currentStretch) * 0.15;
    currentSquash += (targetSquash - currentSquash) * 0.15;

    // Update coordinates and 3D squash transformations
    lens.style.left = `${currentX}px`;
    lens.style.top = `${currentY}px`;
    lens.style.transform = `translate(-50%, -50%) rotate(${currentAngle}rad) scale(${currentStretch}, ${currentSquash})`;

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

    // Dynamically adjust SVG displacement filter mapping scale based on lens radius!
    const dispMapEl = document.querySelector('#fluidGlassRefraction feDisplacementMap');
    if (dispMapEl) {
      const refScale = Math.round(diameter * 0.42);
      dispMapEl.setAttribute('scale', refScale);
    }
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
