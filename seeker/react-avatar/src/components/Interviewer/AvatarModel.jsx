import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { AVATAR_STATES, AVATAR_ANIMATIONS } from '../../state/avatarStateMachine';

export function AvatarModel({ state, getRMSVolume, modelUrl = '/assets/models/interviewer_avatar.glb' }) {
  // Load model & extract nodes, materials, animations
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, mixer } = useAnimations(animations, scene);

  // References to bones
  const jawBoneRef = useRef(null);
  const neckBoneRef = useRef(null);
  const headBoneRef = useRef(null);
  const leftEyelidRef = useRef(null);
  const rightEyelidRef = useRef(null);
  const meshesWithBlinkMorphs = useRef([]);

  // Blinking system states
  const [blink, setBlink] = useState(false);
  const blinkTimerRef = useRef(0);
  const nextBlinkTimeRef = useRef(3); // First blink in 3s
  const blinkProgressRef = useRef(0);

  // Cache bones on load
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isBone) {
        const name = child.name.toLowerCase();
        if (name.includes('jaw') || name === 'jaw') {
          jawBoneRef.current = child;
        } else if (name.includes('neck') || name === 'neck') {
          neckBoneRef.current = child;
        } else if (name.includes('head') || name === 'head') {
          headBoneRef.current = child;
        } else if (name.includes('eyelid_l') || name.includes('eyelidleft')) {
          leftEyelidRef.current = child;
        } else if (name.includes('eyelid_r') || name.includes('eyelidright')) {
          rightEyelidRef.current = child;
        }
      }

      // Check if mesh has morph targets for eye blinking (e.g. eyeBlinkLeft / eyeBlinkRight)
      if (child.isMesh && child.morphTargetDictionary) {
        const dict = child.morphTargetDictionary;
        if ('eyeBlinkLeft' in dict || 'eyeBlink_L' in dict || 'blink_L' in dict || 'blink' in dict) {
          meshesWithBlinkMorphs.current.push(child);
        }
      }
    });

    // Make sure bones rotate independently of root animation rotations where required
    if (jawBoneRef.current) {
      // Set rotation mode to Euler
      jawBoneRef.current.rotation.order = 'XYZ';
    }
  }, [scene]);

  // Handle crossfading animations when the state changes
  useEffect(() => {
    // Determine target clip based on active state
    let targetActionName = AVATAR_ANIMATIONS.IDLE;
    if (state === AVATAR_STATES.SPEAKING) {
      targetActionName = AVATAR_ANIMATIONS.SPEAKING;
    } else if (state === AVATAR_STATES.LISTENING) {
      targetActionName = AVATAR_ANIMATIONS.LISTENING;
    }

    // Convert keys to upper to find action in loaded animations
    const matchingAction = actions[targetActionName] || actions[Object.keys(actions)[0]];
    
    if (matchingAction) {
      // Play target animation and crossfade from others
      Object.values(actions).forEach((action) => {
        if (action !== matchingAction) {
          action.fadeOut(0.4);
        }
      });
      matchingAction.reset().fadeIn(0.4).play();
    }
  }, [state, actions]);

  // Frame tick animation loop updates
  useFrame((stateObj, delta) => {
    const time = stateObj.clock.getElapsedTime();

    // 1. BLINK SYSTEM (Random interval 2s to 6s)
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current >= nextBlinkTimeRef.current) {
      setBlink(true);
      blinkTimerRef.current = 0;
      // Set random interval for next blink
      nextBlinkTimeRef.current = 2 + Math.random() * 4;
      blinkProgressRef.current = 0;
    }

    if (blink) {
      // Symmetrical opening/closing speed: complete blink in 0.25 seconds
      blinkProgressRef.current += delta * 4; 
      if (blinkProgressRef.current >= 1.0) {
        setBlink(false);
        blinkProgressRef.current = 0;
      }
      
      // Calculate interpolation: 0 -> 1 (closed) -> 0 (open)
      const blinkIntensity = Math.sin(blinkProgressRef.current * Math.PI);

      // Apply to Morph Targets if model includes them
      meshesWithBlinkMorphs.current.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const leftIndex = dict['eyeBlinkLeft'] || dict['eyeBlink_L'] || dict['blink_L'] || dict['blink'];
        const rightIndex = dict['eyeBlinkRight'] || dict['eyeBlink_R'] || dict['blink_R'] || dict['blink'];
        
        if (leftIndex !== undefined) mesh.morphTargetInfluences[leftIndex] = blinkIntensity;
        if (rightIndex !== undefined) mesh.morphTargetInfluences[rightIndex] = blinkIntensity;
      });

      // Fallback: Apply to Eyelid bones rotation if morphs are missing
      if (leftEyelidRef.current) {
        // Rotate down around local X-axis
        leftEyelidRef.current.rotation.x = blinkIntensity * 0.5;
      }
      if (rightEyelidRef.current) {
        rightEyelidRef.current.rotation.x = blinkIntensity * 0.5;
      }
    } else {
      // Clear blink targets when not blinking
      meshesWithBlinkMorphs.current.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const leftIndex = dict['eyeBlinkLeft'] || dict['eyeBlink_L'] || dict['blink_L'] || dict['blink'];
        const rightIndex = dict['eyeBlinkRight'] || dict['eyeBlink_R'] || dict['blink_R'] || dict['blink'];
        if (leftIndex !== undefined) mesh.morphTargetInfluences[leftIndex] = 0;
        if (rightIndex !== undefined) mesh.morphTargetInfluences[rightIndex] = 0;
      });
    }

    // 2. LIP SYNC: Drive jaw bone rotation based on volume levels
    if (state === AVATAR_STATES.SPEAKING && jawBoneRef.current) {
      const volume = getRMSVolume(); // Float between 0.0 and 1.0
      
      // Scale volume to max comfortable jaw angle (approx 20 degrees / 0.35 rad)
      const targetJawRotationX = Math.min(volume * 2.0, 1.0) * 0.35;
      
      // Linear interpolate (lerp) current jaw angle to target to smooth out transitions
      jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        jawBoneRef.current.rotation.x,
        targetJawRotationX,
        0.28 // Easing speed
      );
    } else if (jawBoneRef.current) {
      // Return jaw bone to rest position when not speaking
      jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        jawBoneRef.current.rotation.x,
        0,
        0.2
      );
    }

    // 3. IDLE / ATTENTIVE MICRO-MOVEMENT (Slow breathing & noise head drift)
    if (neckBoneRef.current || headBoneRef.current) {
      const breathingWeight = state === AVATAR_STATES.IDLE ? 0.015 : 0.008;
      const breathingSpeed = state === AVATAR_STATES.IDLE ? 1.5 : 0.8;
      
      // Create physiological micro-sway
      const headSwayX = Math.sin(time * breathingSpeed) * breathingWeight;
      const headSwayY = Math.cos(time * 0.7) * 0.005;

      if (headBoneRef.current) {
        headBoneRef.current.rotation.x += headSwayX * 0.1;
        headBoneRef.current.rotation.y += headSwayY * 0.1;
      }
      if (neckBoneRef.current) {
        neckBoneRef.current.rotation.x += headSwayX * 0.2;
      }
      
      // Listening responsive head nodding (slow positive reinforcement cues)
      if (state === AVATAR_STATES.LISTENING) {
        const nodIntensity = Math.sin(time * 2.2);
        if (nodIntensity > 0.8 && neckBoneRef.current) {
          // Nod downward slowly
          neckBoneRef.current.rotation.x = THREE.MathUtils.lerp(
            neckBoneRef.current.rotation.x,
            0.05,
            0.1
          );
        }
      }
    }
  });

  return <primitive object={scene} scale={1.8} position={[0, -2.8, 0]} />;
}
