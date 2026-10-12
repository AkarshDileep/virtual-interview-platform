import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Calibrated idle pose for the interviewer
const IDLE_POSE = {
  rArmX: -1.86, rArmY: 2.86, rArmZ: 2.60,
  rForeX: -0.21, rForeY: -1.60, rForeZ: -2.02,
  rHandX: -0.49, rHandY: -1.06, rHandZ: -0.49,
};

const LEFT_IDLE_POSE = {
  armX: 1.06, armY: -0.74, armZ: 0.26,
  forearmX: 1.06, forearmY: -0.54, forearmZ: 0.46,
};

const WAVE_POSE = {
  rArmX: -1.86, rArmY: 2.15, rArmZ: 2.21,
  rForeX: 0.96, rForeY: -0.55, rForeZ: -2.02,
  rHandX: -0.49, rHandY: -1.06, rHandZ: -0.49,
};

const Avatar = ({ isSpeaking, isWaving = false, avatarY = -1.5, wavePose = WAVE_POSE, avatarPath = '/model.glb', avatarScale = 1.2, avatarOffset = [0, 0, 0] }) => {
  const { scene, animations } = useGLTF(avatarPath);
  const { actions } = useAnimations(animations, scene);
  const group = useRef();

  // Bones
  const jawBone = useRef(null);
  const mouthBones = useRef([]);
  const mouthBoneBases = useRef(new Map());
  const headMesh = useRef(null);
  const mouthMorphIndices = useRef([]);
  const visemeMorphs = useRef({});
  const blinkMorphIndex = useRef(-1);
  const eyelidBones = useRef([]);
  const eyelidBases = useRef(new Map());
  const neckBone = useRef(null);
  const spineBone = useRef(null);

  const rightArm = useRef(null);
  const rightForeArm = useRef(null);
  const rightHandBone = useRef(null);
  const leftArm = useRef(null);
  const leftForeArm = useRef(null);

  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      const name = child.name.toLowerCase();

      if (child.isBone) {
        if (name.includes('neck')) neckBone.current = child;
        if (name.includes('spine') || name.includes('chest')) spineBone.current = child;

        if (name.includes('rightarm') && !name.includes('forearm') && !name.includes('hand')) rightArm.current = child;
        if (name.includes('rightforearm')) rightForeArm.current = child;
        if (name === 'righthand' || name.endsWith('righthand')) rightHandBone.current = child;
        if (name.includes('leftarm') && !name.includes('forearm') && !name.includes('hand')) leftArm.current = child;
        if (name.includes('leftforearm')) leftForeArm.current = child;
        if (name.includes('jaw')) jawBone.current = child;
        if (name.includes('jaw') || name.includes('lip') || name.includes('mouth')) {
          mouthBones.current.push(child);
          mouthBoneBases.current.set(child.uuid, child.rotation.clone());
        }
        if (name.includes('eyelid') || name.includes('eyeclose')) {
          eyelidBones.current.push(child);
          eyelidBases.current.set(child.uuid, child.rotation.clone());
        }
      }

      if (child.isMesh && child.morphTargetDictionary) {
        const dict = child.morphTargetDictionary;
        const mouthIndices = [];
        for (const [key, index] of Object.entries(dict)) {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('mouth') || lowerKey.includes('jaw') || lowerKey.includes('viseme') || lowerKey.includes('lip') || lowerKey.includes('talk') || lowerKey.includes('speak')) {
            mouthIndices.push(index);
          }
          if (lowerKey.includes('blink') || lowerKey.includes('eyeclose')) {
            blinkMorphIndex.current = index;
            headMesh.current = child;
          }
        }
        if (mouthIndices.length > 0) {
          headMesh.current = child;
          mouthMorphIndices.current = mouthIndices;
          visemeMorphs.current = Object.fromEntries(
            Object.entries(dict)
              .filter(([key]) => key.toLowerCase().startsWith('viseme_'))
              .map(([key, index]) => [key.toLowerCase(), index])
          );
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    const embeddedActions = Object.values(actions || {});
    const isSundar = avatarPath.toLowerCase().includes('sundar');
    embeddedActions.forEach(action => {
      // facial_animation.glb and sundar_pichai contain root/controller/full-body tracks
      // that displace the avatar out of frame/table, so full-body clips must be stopped.
      if (avatarPath.includes('facial_animation') || isSundar) {
        action.stop();
      } else if (isSpeaking) {
        action.reset().fadeIn(0.2).play();
      } else {
        action.fadeOut(0.2).stop();
      }
    });
    return () => embeddedActions.forEach(action => action.stop());
  }, [actions, avatarPath, isSpeaking]);

  const targetLook = useRef(new THREE.Vector2(0, 0));
  const blinkTimer = useRef(0);
  const targetNeckX = useRef(0);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const isSundar = avatarPath.toLowerCase().includes('sundar');

    // --- Blinking ---
    blinkTimer.current -= delta;
    if (blinkTimer.current <= 0) blinkTimer.current = 2.5 + Math.random() * 3.5;
    const blinkVal = blinkTimer.current < 0.12 ? 1 : 0;
    if (headMesh.current && blinkMorphIndex.current !== -1) {
      headMesh.current.morphTargetInfluences[blinkMorphIndex.current] = THREE.MathUtils.lerp(
        headMesh.current.morphTargetInfluences[blinkMorphIndex.current], blinkVal, 0.6
      );
    }
    const blinkAmount = blinkTimer.current < 0.12 ? 1 : 0;
    eyelidBones.current.forEach(bone => {
      const base = eyelidBases.current.get(bone.uuid);
      if (!base) return;
      bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, base.x + blinkAmount * 0.35, 0.45);
    });

    // --- Eye Contact ---
    if (Math.random() < 0.04) {
      if (Math.random() < 0.85) {
        targetLook.current.set(0, 0);
      } else {
        targetLook.current.set((Math.random() - 0.5) * 0.07, (Math.random() - 0.5) * 0.05);
      }
    }

    // Natural speech cadence & subtle head movement
    const speechCadence = isSpeaking ? Math.sin(time * 4.2) * (isSundar ? 0.018 : 0.03) : 0;
    const talkTiltX = isSpeaking ? (isSundar ? 0.0 : -0.15) : 0.0;
    targetNeckX.current = THREE.MathUtils.lerp(targetNeckX.current, talkTiltX + speechCadence + targetLook.current.y, 0.06);

    if (neckBone.current) {
      neckBone.current.rotation.y = THREE.MathUtils.lerp(neckBone.current.rotation.y, targetLook.current.x, 0.1);
      neckBone.current.rotation.x = THREE.MathUtils.lerp(neckBone.current.rotation.x, targetNeckX.current, 0.08);
    }
    if (spineBone.current) {
      spineBone.current.rotation.y = THREE.MathUtils.lerp(spineBone.current.rotation.y, targetLook.current.x * 0.3, 0.05);
      spineBone.current.rotation.x = Math.sin(time * 2.0) * (isSundar ? 0.005 : 0.012);
    }

    // --- Arm Poses & Greeting Wave (exact like original interviewer) ---
    if (leftArm.current) leftArm.current.rotation.set(LEFT_IDLE_POSE.armX, LEFT_IDLE_POSE.armY, LEFT_IDLE_POSE.armZ);
    if (leftForeArm.current) leftForeArm.current.rotation.set(LEFT_IDLE_POSE.forearmX, LEFT_IDLE_POSE.forearmY, LEFT_IDLE_POSE.forearmZ);

    const waveAmount = isWaving ? 1 : 0;
    if (rightArm.current) {
      rightArm.current.rotation.x = THREE.MathUtils.lerp(IDLE_POSE.rArmX, wavePose.rArmX, waveAmount);
      rightArm.current.rotation.y = THREE.MathUtils.lerp(IDLE_POSE.rArmY, wavePose.rArmY, waveAmount);
      rightArm.current.rotation.z = THREE.MathUtils.lerp(IDLE_POSE.rArmZ, wavePose.rArmZ, waveAmount);
    }
    if (rightForeArm.current) {
      rightForeArm.current.rotation.x = THREE.MathUtils.lerp(IDLE_POSE.rForeX, wavePose.rForeX, waveAmount);
      rightForeArm.current.rotation.y = THREE.MathUtils.lerp(IDLE_POSE.rForeY, wavePose.rForeY, waveAmount);
      rightForeArm.current.rotation.z = THREE.MathUtils.lerp(IDLE_POSE.rForeZ, wavePose.rForeZ, waveAmount);
    }
    if (rightHandBone.current) {
      const smoothWave = isWaving ? Math.sin(time * 3.4) * 0.22 : 0;
      rightHandBone.current.rotation.x = THREE.MathUtils.lerp(IDLE_POSE.rHandX, wavePose.rHandX, waveAmount);
      rightHandBone.current.rotation.y = THREE.MathUtils.lerp(IDLE_POSE.rHandY, wavePose.rHandY + smoothWave * 0.4, waveAmount);
      rightHandBone.current.rotation.z = THREE.MathUtils.lerp(IDLE_POSE.rHandZ, wavePose.rHandZ + smoothWave, waveAmount);
    }

    // Drive the exported jaw bone and facial viseme shape keys.
    if (isSpeaking) {
      const syllable = Math.sin(time * 25) * Math.cos(time * 20);
      const talkValue = Math.abs(syllable) * 0.8 + 0.2;
      if (headMesh.current && mouthMorphIndices.current.length > 0) {
        const aa = Math.max(0, Math.sin(time * 6.2)) * talkValue;
        const ee = Math.max(0, Math.sin(time * 6.2 + 2.0)) * talkValue * 0.8;
        const oo = Math.max(0, Math.sin(time * 6.2 + 4.0)) * talkValue * 0.75;
        const mbp = Math.max(0, Math.sin(time * 9.5 + 1.2)) * 0.7;
        const targets = { viseme_aa: aa, viseme_ee: ee, viseme_oo: oo, viseme_mbp: mbp };
        Object.entries(visemeMorphs.current).forEach(([name, index]) => {
          headMesh.current.morphTargetInfluences[index] = THREE.MathUtils.lerp(
            headMesh.current.morphTargetInfluences[index], targets[name] || talkValue * 0.35, 0.5
          );
        });
      }
      if (jawBone.current) {
        jawBone.current.rotation.x = THREE.MathUtils.lerp(jawBone.current.rotation.x, talkValue * 0.4, 0.5);
        jawBone.current.rotation.z = THREE.MathUtils.lerp(jawBone.current.rotation.z, talkValue * 0.4, 0.5);
      }
      mouthBones.current.forEach(bone => {
        if (bone === jawBone.current) return;
        const base = mouthBoneBases.current.get(bone.uuid);
        if (!base) return;
        bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, base.x + Math.sin(time * 12) * 0.12, 0.35);
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, base.z + Math.sin(time * 9 + 1) * 0.08, 0.35);
      });
    } else {
      if (headMesh.current && mouthMorphIndices.current.length > 0) mouthMorphIndices.current.forEach((idx) => {
        headMesh.current.morphTargetInfluences[idx] = THREE.MathUtils.lerp(headMesh.current.morphTargetInfluences[idx], 0, 0.2);
      });
      if (jawBone.current) {
        jawBone.current.rotation.x = THREE.MathUtils.lerp(jawBone.current.rotation.x, 0, 0.2);
        jawBone.current.rotation.z = THREE.MathUtils.lerp(jawBone.current.rotation.z, 0, 0.2);
      }
      mouthBones.current.forEach(bone => {
        const base = mouthBoneBases.current.get(bone.uuid);
        if (!base) return;
        bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, base.x, 0.2);
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, base.z, 0.2);
      });
    }
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} position={[avatarOffset[0], avatarY + avatarOffset[1], -0.2 + avatarOffset[2]]} scale={avatarScale} />
    </group>
  );
};

useGLTF.preload('/model.glb');
useGLTF.preload('/facial_animation.glb');
useGLTF.preload('/animated_google_ceo_sundar_pichai_avatar.glb');
export default Avatar;
