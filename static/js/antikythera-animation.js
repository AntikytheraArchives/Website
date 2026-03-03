/**
 * Antikythera Animation
 * 
 * Converts Unity DoTween animation to GSAP (GreenSock Animation Platform)
 * This is the web equivalent of your Unity DoTween animation.
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Timing
    initialDelayDuration: 0.5,
    rustyDuration: 0.5,
    smoothDuration: 0.6,
    snapDuration: 0.2,
    logoFadeDuration: 1.5,
    
    // Rotation
    rotationDegrees: 90,
    
    // Shake effect (in pixels)
    initialShakeStrength: 15,
    finalShakeStrength: 0,
    
    // Initial rotations
    startRotationA: 90,   // Left gear
    startRotationB: 180,  // Right gear
    
    // Animation control
    loopAnimation: false,   // Set to true to loop the animation
    startOnClick: true,    // Set to true to require user click to start
    loopDelay: 2,         // Seconds between loops (if loopAnimation is true)
  };

  // ============================================
  // ELEMENT REFERENCES
  // ============================================
  let circleA, circleB, logoText, logoImg;
  let sfxStart, sfxEnd, sfxLogo;
  let audioContext = null;

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    // Get element references
    circleA = document.getElementById('circle-a');
    circleB = document.getElementById('circle-b');
    logoText = document.getElementById('logo-text');
    logoImg = logoText ? logoText.querySelector('img') : null;
    sfxStart = document.getElementById('sfx-start');
    sfxEnd = document.getElementById('sfx-end');
    sfxLogo = document.getElementById('sfx-logo');

    if (!circleA || !circleB || !logoText) {
      console.warn('Antikythera animation elements not found');
      return;
    }

    // Apply CSS filters to color white images
    // Gears: white -> black (brightness(0))
    circleA.style.filter = 'brightness(0)';
    circleB.style.filter = 'brightness(0)';
    
    // Logo: white -> yellow
    if (logoImg) {
      logoImg.style.filter = 'sepia(1) saturate(5) hue-rotate(0deg) brightness(1.2)';
    }

    // Set initial rotations
    gsap.set(circleA, { rotation: CONFIG.startRotationA });
    gsap.set(circleB, { rotation: CONFIG.startRotationB });
    gsap.set(logoText, { opacity: 0 });

    // Add double-click handler to restart animation
    logoText.addEventListener('dblclick', () => {
      console.log('Restarting animation...');
      window.AntikytheraAnimation.reset();
      playAntikytheraAnimation();
    });

    // Initialize audio context on first user interaction (required by browsers)
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    // Start the animation (or wait for click)
    if (CONFIG.startOnClick) {
      // Add click handler to start animation
      const startHandler = () => {
        playAntikytheraAnimation();
        document.removeEventListener('click', startHandler);
        document.removeEventListener('touchstart', startHandler);
      };
      document.addEventListener('click', startHandler);
      document.addEventListener('touchstart', startHandler);
      console.log('Click anywhere to start animation');
    } else {
      // Auto-start
      playAntikytheraAnimation();
    }
  }

  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  // ============================================
  // SOUND EFFECTS
  // ============================================
  function playSFX(audioElement) {
    if (!audioElement) return;
    
    // Clone to allow overlapping sounds
    const clone = audioElement.cloneNode();
    clone.volume = 0.7;
    
    const playPromise = clone.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        // Autoplay prevented - user needs to interact first
        console.log('Audio playback prevented:', err.message);
      });
    }

    // Clean up clone after playing
    clone.onended = () => clone.remove();
  }

  // ============================================
  // SHAKE EFFECT
  // Simulates DoTween's DOShakeAnchorPos
  // ============================================
  function shakeElement(element, duration, strength) {
    const shakeTimeline = gsap.timeline();
    const shakeCount = 10;
    const interval = duration / shakeCount;

    for (let i = 0; i < shakeCount; i++) {
      const x = (Math.random() - 0.5) * strength * 2;
      const y = (Math.random() - 0.5) * strength * 2;
      shakeTimeline.to(element, {
        x: `+=${x}`,
        y: `+=${y}`,
        duration: interval,
        ease: 'none'
      });
    }

    // Return to center
    shakeTimeline.to(element, {
      x: 0,
      y: 0,
      duration: 0.1,
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
        console.log('Antikythera animation complete');
        
        // Loop animation if enabled
        if (CONFIG.loopAnimation) {
          setTimeout(() => {
            // Reset positions before looping
            window.AntikytheraAnimation.reset();
            playAntikytheraAnimation();
          }, CONFIG.loopDelay * 1000);
        }
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
      0 // Add at current position
    );

    seq.add(
      gsap.to(circleB, {
        rotation: rustyRotB,
        duration: CONFIG.rustyDuration,
        ease: 'power1.inOut'
      }),
      0
    );

    // Apply shake during rusty phase
    seq.add(
      shakeElement(circleA, CONFIG.rustyDuration, CONFIG.initialShakeStrength),
      0
    );

    seq.add(
      shakeElement(circleB, CONFIG.rustyDuration, CONFIG.initialShakeStrength),
      0
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
      gsap.killTweensOf([circleA, circleB, logoText]);
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
