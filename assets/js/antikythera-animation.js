/**
 * Antikythera Animation
 * 
 * Converts Unity DoTween animation to GSAP (GreenSock Animation Platform)
 * This is the web equivalent of your Unity DoTween animation.
 */

(function() {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function parseCssColorToRgb(input) {
    if (!input) return null;
    const v = input.trim();
    if (!v) return null;

    const hexMatch = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }

    const rgbMatch = v.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)$/i);
    if (rgbMatch) {
      return {
        r: clamp(Math.round(parseFloat(rgbMatch[1])), 0, 255),
        g: clamp(Math.round(parseFloat(rgbMatch[2])), 0, 255),
        b: clamp(Math.round(parseFloat(rgbMatch[3])), 0, 255)
      };
    }

    return null;
  }

  class Color {
    constructor(r, g, b) {
      this.r = r;
      this.g = g;
      this.b = b;
    }

    set(r, g, b) {
      this.r = clamp(r, 0, 255);
      this.g = clamp(g, 0, 255);
      this.b = clamp(b, 0, 255);
    }

    hueRotate(angle = 0) {
      const rad = (angle / 180) * Math.PI;
      const sin = Math.sin(rad);
      const cos = Math.cos(rad);

      const matrix = [
        0.213 + cos * 0.787 - sin * 0.213,
        0.715 - cos * 0.715 - sin * 0.715,
        0.072 - cos * 0.072 + sin * 0.928,
        0.213 - cos * 0.213 + sin * 0.143,
        0.715 + cos * 0.285 + sin * 0.140,
        0.072 - cos * 0.072 - sin * 0.283,
        0.213 - cos * 0.213 - sin * 0.787,
        0.715 - cos * 0.715 + sin * 0.715,
        0.072 + cos * 0.928 + sin * 0.072
      ];

      const newR = this.r * matrix[0] + this.g * matrix[1] + this.b * matrix[2];
      const newG = this.r * matrix[3] + this.g * matrix[4] + this.b * matrix[5];
      const newB = this.r * matrix[6] + this.g * matrix[7] + this.b * matrix[8];
      this.set(newR, newG, newB);
    }

    grayscale(value = 1) {
      this.multiply([
        0.2126 + 0.7874 * (1 - value),
        0.7152 - 0.7152 * (1 - value),
        0.0722 - 0.0722 * (1 - value),
        0.2126 - 0.2126 * (1 - value),
        0.7152 + 0.2848 * (1 - value),
        0.0722 - 0.0722 * (1 - value),
        0.2126 - 0.2126 * (1 - value),
        0.7152 - 0.7152 * (1 - value),
        0.0722 + 0.9278 * (1 - value)
      ]);
    }

    sepia(value = 1) {
      this.multiply([
        0.393 + 0.607 * (1 - value),
        0.769 - 0.769 * (1 - value),
        0.189 - 0.189 * (1 - value),
        0.349 - 0.349 * (1 - value),
        0.686 + 0.314 * (1 - value),
        0.168 - 0.168 * (1 - value),
        0.272 - 0.272 * (1 - value),
        0.534 - 0.534 * (1 - value),
        0.131 + 0.869 * (1 - value)
      ]);
    }

    saturate(value = 1) {
      this.multiply([
        0.213 + 0.787 * value,
        0.715 - 0.715 * value,
        0.072 - 0.072 * value,
        0.213 - 0.213 * value,
        0.715 + 0.285 * value,
        0.072 - 0.072 * value,
        0.213 - 0.213 * value,
        0.715 - 0.715 * value,
        0.072 + 0.928 * value
      ]);
    }

    multiply(matrix) {
      const newR = this.r * matrix[0] + this.g * matrix[1] + this.b * matrix[2];
      const newG = this.r * matrix[3] + this.g * matrix[4] + this.b * matrix[5];
      const newB = this.r * matrix[6] + this.g * matrix[7] + this.b * matrix[8];
      this.set(newR, newG, newB);
    }

    brightness(value = 1) {
      this.linear(value);
    }

    contrast(value = 1) {
      this.linear(value, -(0.5 * value) + 0.5);
    }

    linear(slope = 1, intercept = 0) {
      this.set(this.r * slope + intercept * 255, this.g * slope + intercept * 255, this.b * slope + intercept * 255);
    }

    invert(value = 1) {
      this.set(
        (value + this.r / 255 * (1 - 2 * value)) * 255,
        (value + this.g / 255 * (1 - 2 * value)) * 255,
        (value + this.b / 255 * (1 - 2 * value)) * 255
      );
    }
  }

  class FilterSolver {
    constructor(target) {
      this.target = target;
      this.targetHsl = this.rgbToHsl(target);
      this.reusedColor = new Color(0, 0, 0);
    }

    solve() {
      const wide = this.optimize(5, [50, 20, 3750, 50, 100, 100]);
      const narrow = this.optimize(1, wide.values, wide.loss);
      return narrow;
    }

    optimize(startLoss, startValues, startLossValue) {
      let best = { loss: startLossValue ?? Infinity, values: startValues.slice(0) };
      let values = startValues.slice(0);
      let loss = best.loss;

      const maxIterations = 1000;
      const deltas = [
        20,   // invert
        20,   // sepia
        600,  // saturate
        20,   // hue
        20,   // brightness
        20    // contrast
      ];

      for (let i = 0; i < maxIterations; i++) {
        const candidate = values.slice(0);
        for (let j = 0; j < candidate.length; j++) {
          const delta = deltas[j];
          const change = (Math.random() * 2 - 1) * delta;
          candidate[j] = candidate[j] + change;
        }

        candidate[0] = clamp(candidate[0], 0, 100);
        candidate[1] = clamp(candidate[1], 0, 100);
        candidate[2] = clamp(candidate[2], 0, 7500);
        candidate[3] = ((candidate[3] % 360) + 360) % 360;
        candidate[4] = clamp(candidate[4], 0, 200);
        candidate[5] = clamp(candidate[5], 0, 200);

        const candidateLoss = this.loss(candidate);
        if (candidateLoss < loss) {
          values = candidate;
          loss = candidateLoss;
          if (loss < best.loss) {
            best = { loss, values: values.slice(0) };
          }
          if (loss < startLoss) break;
        }
      }

      return best;
    }

    loss(filters) {
      const color = this.reusedColor;
      color.set(0, 0, 0);
      color.invert(filters[0] / 100);
      color.sepia(filters[1] / 100);
      color.saturate(filters[2] / 100);
      color.hueRotate(filters[3]);
      color.brightness(filters[4] / 100);
      color.contrast(filters[5] / 100);

      const rgbLoss = Math.abs(color.r - this.target.r) + Math.abs(color.g - this.target.g) + Math.abs(color.b - this.target.b);
      const colorHsl = this.rgbToHsl({ r: color.r, g: color.g, b: color.b });
      const hslLoss = Math.abs(colorHsl.h - this.targetHsl.h) + Math.abs(colorHsl.s - this.targetHsl.s) + Math.abs(colorHsl.l - this.targetHsl.l);
      return rgbLoss + hslLoss;
    }

    rgbToHsl(rgb) {
      let r = rgb.r / 255;
      let g = rgb.g / 255;
      let b = rgb.b / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s;
      const l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          default:
            h = (r - g) / d + 4;
            break;
        }
        h = h / 6;
      }

      return { h: h * 100, s: s * 100, l: l * 100 };
    }
  }

  function computeCssFilterForRgb(rgb) {
    if (!rgb) return null;
    const solver = new FilterSolver(rgb);
    const result = solver.solve();
    const v = result.values;
    return `brightness(0) saturate(100%) invert(${Math.round(v[0])}%) sepia(${Math.round(v[1])}%) saturate(${Math.round(v[2])}%) hue-rotate(${Math.round(v[3])}deg) brightness(${Math.round(v[4])}%) contrast(${Math.round(v[5])}%)`;
  }

  function applyThemeFilters() {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const bg = parseCssColorToRgb(cs.getPropertyValue('--background'));
    const fg = parseCssColorToRgb(cs.getPropertyValue('--foreground'));
    const bgFilter = computeCssFilterForRgb(bg);
    const fgFilter = computeCssFilterForRgb(fg);

    if (bgFilter) root.style.setProperty('--antikythera-gear-filter', bgFilter);
    if (fgFilter) root.style.setProperty('--antikythera-logo-filter', fgFilter);
  }

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    restartAnimationOnClick: false,

    // Timing
    initialDelayDuration: 1.5,
    rustyDuration: 1.5,
    smoothDuration: 1.0,
    snapDuration: 0.3,
    logoFadeDuration: 1.25,
    
    // Rotation
    rotationDegrees: 90,
    
    // Shake effect (percentage of element size - 5 = 5% vibration)
    initialShakeStrength: 0.5,
    finalShakeStrength: 0.1,
    
    // Initial rotations
    startRotationA: 90,   // Left gear
    startRotationB: 180,  // Right gear
  };

  // ============================================
  // ELEMENT REFERENCES
  // ============================================
  let circleA, circleB, gearRectangle, logoText, logoImg;
  let sfxStart, sfxEnd, sfxLogo;
  let audioContext = null;
  let activeAudioClones = [];

  // ============================================
  // INITIALIZATION
  // ============================================

  async function onClick()
  { 
    if (!CONFIG.restartAnimationOnClick) return;

    window.AntikytheraAnimation.reset();
    gearRectangle.removeEventListener('click', onClick);
    logoText.removeEventListener('click', onClick);
    CONFIG.initialDelayDuration = 0;
    
    // Wait for sounds to be ready before playing
    await Promise.all([
      waitForAudioLoad(sfxStart),
      waitForAudioLoad(sfxEnd),
      waitForAudioLoad(sfxLogo)
    ]);
    
    playAntikytheraAnimation();
  }
    
  function addClickEventListeners(){
    // Add double-click handler to restart animation
    logoText.addEventListener('click', onClick);

    // Add single-click handler to restart animation
    gearRectangle.addEventListener('click', onClick);
  }
  
  function waitForAudioLoad(audio) {
    return new Promise((resolve) => {
      if (!audio) {
        resolve();
        return;
      }
      // readyState >= 3 means enough data is available to start playing
      if (audio.readyState >= 3) {
        resolve();
        return;
      }
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      // Fallback: resolve after 5 seconds even if not loaded
      setTimeout(() => resolve(), 5000);
    });
  }

  async function init() {
    // Get element references
    circleA = document.getElementById('circle-a');
    circleB = document.getElementById('circle-b');
    gearRectangle = document.getElementById('gear-rectangle');
    logoText = document.getElementById('logo-text');
    logoImg = logoText ? logoText.querySelector('img') : null;
    sfxStart = document.getElementById('sfx-start');
    sfxEnd = document.getElementById('sfx-end');
    sfxLogo = document.getElementById('sfx-logo');
    
    if (!circleA || !circleB || !logoText) {
      console.warn('Antikythera animation elements not found');
      return;
    }

    applyThemeFilters();

    // Set initial rotations
    gsap.set(circleA, { rotation: CONFIG.startRotationA });
    gsap.set(circleB, { rotation: CONFIG.startRotationB });
    gsap.set(logoText, { opacity: 0 });

    initAudio();
    
    // Wait for all sounds to be loaded before starting animation
    await Promise.all([
      waitForAudioLoad(sfxStart),
      waitForAudioLoad(sfxEnd),
      waitForAudioLoad(sfxLogo)
    ]);
    
    playAntikytheraAnimation();
  }

  function initAudio() {
    // For HTML5 audio, we need to ensure audio is "unlocked" after user interaction
    // Try to play and immediately pause each audio element to unlock them
    [sfxStart, sfxEnd, sfxLogo].forEach(audio => {
      if (!audio) return;
      const wasMuted = audio.muted;
      audio.muted = true;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = wasMuted;
        }).catch(() => {
          audio.muted = wasMuted;
        });
      }
    });
  }

  // ============================================
  // SOUND EFFECTS
  // ============================================
  function playSFX(audioElement) {
    if (!audioElement) {
      console.warn('playSFX called with null audio element');
      return;
    }

    // Clone to allow overlapping sounds
    const clone = audioElement.cloneNode(true);
    clone.volume = 0.7;
    clone.style.display = 'none';
    document.body.appendChild(clone);
    
    // Track this clone so we can stop it if needed
    activeAudioClones.push(clone);
    
    const playPromise = clone.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {

      }).catch(err => {
        console.error('Audio playback error:', audioElement.id, err.message);
      });
    }

    // Clean up clone after playing
    clone.onended = () => {
      const idx = activeAudioClones.indexOf(clone);
      if (idx > -1) activeAudioClones.splice(idx, 1);
      clone.remove();
    };
  }

  function stopAllSFX() {
    activeAudioClones.forEach(clone => {
      clone.pause();
      clone.currentTime = 0;
      clone.remove();
    });
    activeAudioClones = [];
  }

  // ============================================
  // SHAKE EFFECT
  // Element dimension-based vibration (not displacement)
  // ============================================
  function shakeElement(element, duration, strengthPercent) {
    const shakeTimeline = gsap.timeline();
    const shakeCount = 15;
    const interval = duration / shakeCount;
    
    // Get element dimensions
    const rect = element.getBoundingClientRect();
    const elementSize = Math.min(rect.width, rect.height);
    
    // Calculate max shake distance as percentage of element size (vibration, not displacement)
    // strengthPercent of 10 means shake up to 10% of element dimension
    const maxShake = elementSize * (strengthPercent / 100);

    for (let i = 0; i < shakeCount; i++) {
      // Random vibration around center (small, quick movements)
      const x = (Math.random() - 0.5) * maxShake;
      const y = (Math.random() - 0.5) * maxShake;
      shakeTimeline.to(element, {
        x: x,
        y: y,
        duration: interval,
        ease: 'none'
      });
    }

    // Return to exact center (no residual displacement)
    shakeTimeline.to(element, {
      x: 0,
      y: 0,
      duration: 0.05,
      ease: 'power2.out'
    });

    return shakeTimeline;
  }

  // ============================================
  // MAIN ANIMATION SEQUENCE
  // ============================================
  function playAntikytheraAnimation() {
    // Start from initial rotations
    const startRotA = CONFIG.startRotationA;
    const startRotB = CONFIG.startRotationB;

    // Calculate target rotations (opposite directions)
    const endRotA = startRotA - CONFIG.rotationDegrees;
    const endRotB = startRotB + CONFIG.rotationDegrees;

    // Create GSAP Timeline (equivalent to DoTween.Sequence)
    const seq = gsap.timeline({
      onComplete: () => {
        addClickEventListeners()
      }
    });

    // 1. Initial delay
    seq.to({}, { duration: CONFIG.initialDelayDuration });

    // 2. Play start sound
    seq.call(() => playSFX(sfxStart));

    // 3. RUSTY PHASE
    //    - Both circles rotate slightly (10% of target)
    //    - Shake effect applied
    const rustyRotA = startRotA - (CONFIG.rotationDegrees * 0.1);
    const rustyRotB = startRotB + (CONFIG.rotationDegrees * 0.1);

    seq.add(
      gsap.to(circleA, {
        rotation: rustyRotA,
        duration: CONFIG.rustyDuration,
        ease: 'power1.inOut'
      }),
      CONFIG.initialDelayDuration // Add at current position
    );

    seq.add(
      gsap.to(circleB, {
        rotation: rustyRotB,
        duration: CONFIG.rustyDuration,
        ease: 'power1.inOut'
      }),
      CONFIG.initialDelayDuration
    );

    // Apply shake during rusty phase
    seq.add(
      shakeElement(circleA, CONFIG.rustyDuration, CONFIG.initialShakeStrength),
      CONFIG.initialDelayDuration
    );

    seq.add(
      shakeElement(circleB, CONFIG.rustyDuration, CONFIG.initialShakeStrength),
      CONFIG.initialDelayDuration
    );

    // 4. Play end sound
    seq.call(() => playSFX(sfxEnd));

    // 5. SMOOTH ROTATION PHASE
    //    - Rotate to 90% of target
    const smoothRotA = startRotA - (CONFIG.rotationDegrees * 0.9);
    const smoothRotB = startRotB + (CONFIG.rotationDegrees * 0.9);

    seq.add(
      gsap.to(circleA, {
        rotation: smoothRotA,
        duration: CONFIG.smoothDuration,
        ease: 'power2.inOut'
      })
    );

    seq.add(
      gsap.to(circleB, {
        rotation: smoothRotB,
        duration: CONFIG.smoothDuration,
        ease: 'power2.inOut'
      }),
      '<' // Start at same time as previous
    );

    // 6. FINAL SNAP PHASE (with OutBack easing - equivalent to DoTween's Ease.OutBack)
    seq.add(
      gsap.to(circleA, {
        rotation: endRotA,
        duration: CONFIG.snapDuration,
        ease: 'back.out(1.7)' // OutBack equivalent
      })
    );

    seq.add(
      gsap.to(circleB, {
        rotation: endRotB,
        duration: CONFIG.snapDuration,
        ease: 'back.out(1.7)'
      }),
      '<'
    );

    // Reset positions after shake
    seq.to(circleA, {
      x: 0,
      y: 0,
      duration: CONFIG.snapDuration,
      ease: 'power2.out'
    }, '<');

    seq.to(circleB, {
      x: 0,
      y: 0,
      duration: CONFIG.snapDuration,
      ease: 'power2.out'
    }, '<');

    // 7. LOGO FADE IN
    seq.call(() => playSFX(sfxLogo));
    
    seq.to(logoText, {
      opacity: 1,
      duration: CONFIG.logoFadeDuration,
      ease: 'power2.out'
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================
  window.AntikytheraAnimation = {
    play: playAntikytheraAnimation,
    reset: function() {
      // Stop any playing sound effects
      stopAllSFX();
      gsap.killTweensOf(".myClass");
      gsap.set(circleA, { rotation: CONFIG.startRotationA, x: 0, y: 0 });
      gsap.set(circleB, { rotation: CONFIG.startRotationB, x: 0, y: 0 });
      gsap.set(logoText, { opacity: 0 });
    }
  };

  // ============================================
  // AUTO-START
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
