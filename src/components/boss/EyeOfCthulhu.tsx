import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGlowTexture } from '../../systems/textures';
import type { BossAnimState } from '../../game/types';

export const BOSS_HOME: [number, number, number] = [0, 6, -6];
const BOSS_Y = BOSS_HOME[1];

interface BossProps {
  animState: BossAnimState;
  hpRatio: number;
  enraged: boolean;
}

/**
 * Procedural Eye of Cthulhu. There is no external model file — the whole boss is
 * built from primitives so the prototype can never render an empty placeholder.
 */
export default function EyeOfCthulhu({ animState, hpRatio, enraged }: BossProps) {
  const root = useRef<THREE.Group>(null);
  const sclera = useRef<THREE.Group>(null);
  const iris = useRef<THREE.Group>(null);
  const pupil = useRef<THREE.Mesh>(null);
  const veins = useRef<THREE.Group>(null);
  const aura = useRef<THREE.Mesh>(null);
  const auraMat = useRef<THREE.MeshBasicMaterial>(null);
  const flashMat = useRef<THREE.MeshStandardMaterial>(null);
  const pupilMat = useRef<THREE.MeshBasicMaterial>(null);

  const glow = useGlowTexture('#ff2222', 0.35);
  const local = useRef({ state: animState, t: 0, prev: animState as BossAnimState });

  // Pupil tracks the guardians standing near the camera (+Z).
  const target = useMemo(() => new THREE.Vector3(0, 1.5, 8), []);

  const tendrils = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return {
          angle: a,
          len: 2.0 + (i % 3) * 0.42,
          phase: i * 0.7,
        };
      }),
    [],
  );

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    const time = state.clock.elapsedTime;
    const L = local.current;

    if (L.state !== animState) {
      L.prev = L.state;
      L.state = animState;
      L.t = 0;
    }
    L.t += delta;

    const speed = enraged ? 1.85 : 1;
    const idleBob = Math.sin(time * 1.5 * speed) * 0.55;
    const idleRoll = Math.sin(time * 0.6 * speed) * 0.08;

    let x = BOSS_HOME[0];
    let y = BOSS_Y + idleBob;
    let z = BOSS_HOME[2];
    let scale = 1;

    switch (animState) {
      case 'IDLE':
      case 'ENRAGED': {
        // slow orbit + gentle breathing
        x += Math.sin(time * 0.32 * speed) * 1.4;
        y += Math.sin(time * 1.15 * speed) * 0.28;
        scale = 1 + Math.sin(time * 1.9 * speed) * (enraged ? 0.045 : 0.025);
        break;
      }
      case 'ATTACK': {
        const t = L.t;
        if (t < 0.42) {
          // wind up: pull backward and swell
          const k = t / 0.42;
          z = BOSS_HOME[2] - k * 3.4;
          y += k * 1.1;
          scale = 1 + k * 0.28;
        } else if (t < 0.78) {
          // charge forward toward the guardians
          const k = (t - 0.42) / 0.36;
          const e = 1 - Math.pow(1 - k, 3);
          z = BOSS_HOME[2] - 3.4 + e * 9.6;
          y += 1.1 - e * 2.0;
          scale = 1.28 - e * 0.18;
        } else {
          // recoil back home
          const k = Math.min(1, (t - 0.78) / 0.5);
          const e = k * k;
          z = BOSS_HOME[2] + 6.2 - e * 6.2;
          y += -0.9 + e * 0.9;
          scale = 1.1 - e * 0.1;
        }
        break;
      }
      case 'HIT': {
        const t = L.t;
        const decay = Math.max(0, 1 - t / 0.6);
        const kick = Math.sin(t * 34) * decay;
        x += kick * 0.85;
        y += Math.abs(kick) * 0.5;
        z += 0.55 * decay;
        scale = 1 + Math.abs(kick) * 0.13;
        break;
      }
      case 'DEFEATED': {
        const t = L.t;
        const shake = Math.max(0, 1 - t / 1.0);
        x += Math.sin(t * 44) * 0.5 * shake;
        y += Math.sin(t * 37) * 0.4 * shake - t * 0.1;
        scale = Math.max(0.0001, 1 - Math.max(0, (t - 0.85) / 0.9));
        break;
      }
    }

    g.position.set(x, y, z);
    g.rotation.z = idleRoll + (animState === 'HIT' ? Math.sin(L.t * 30) * 0.12 * Math.max(0, 1 - L.t * 1.6) : 0);
    g.rotation.y = Math.sin(time * 0.4 * speed) * 0.16 + (animState === 'ATTACK' ? Math.sin(L.t * 8) * 0.06 : 0);
    g.scale.setScalar(scale);

    // The eye continuously looks toward the guardians.
    const world = new THREE.Vector3();
    g.getWorldPosition(world);
    const dir = target.clone().sub(world).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = -Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    if (iris.current) {
      iris.current.rotation.y += (yaw - iris.current.rotation.y) * 0.09;
      iris.current.rotation.x += (pitch - iris.current.rotation.x) * 0.09;
    }
    if (sclera.current) {
      sclera.current.rotation.y = Math.sin(time * 0.9) * 0.05;
    }
    if (pupil.current) {
      const base = enraged ? 1.42 : 1.0;
      const breathe = 1 + Math.sin(time * (enraged ? 6 : 2.6)) * 0.1;
      pupil.current.scale.setScalar(base * breathe);
    }
    if (veins.current) {
      veins.current.rotation.z = time * (enraged ? 0.4 : 0.14);
      veins.current.scale.setScalar(1 + Math.sin(time * (enraged ? 5 : 2)) * 0.05);
    }
    if (aura.current) {
      const pulse = 1 + Math.sin(time * (enraged ? 7 : 3)) * 0.09;
      aura.current.scale.setScalar((enraged ? 1.55 : 1.22) * pulse);
      aura.current.rotation.y = time * 0.3;
    }
    if (auraMat.current) {
      auraMat.current.opacity = enraged ? 0.34 + Math.sin(time * 7) * 0.09 : 0.13;
    }
    if (pupilMat.current) {
      pupilMat.current.color.set(enraged ? '#9e0a0a' : '#1a0505');
    }
    // Damage flash driven by HIT / DEFEATED state
    if (flashMat.current) {
      const flashing = animState === 'HIT' || animState === 'DEFEATED';
      const f = flashing ? Math.max(0, 1 - L.t / 0.35) : 0;
      flashMat.current.emissive.setRGB(f, f * 0.25, f * 0.25);
      flashMat.current.emissiveIntensity = f * 1.6;
    }
  });

  const bloodTint = enraged ? '#c43a3a' : '#b45c5c';

  return (
    <group ref={root} position={BOSS_HOME}>
      {/* Volumetric red aura */}
      <mesh ref={aura}>
        <sphereGeometry args={[5.4, 20, 20]} />
        <meshBasicMaterial
          ref={auraMat}
          color={enraged ? '#ff2020' : '#7a1020'}
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Fleshy tendrils hanging from the eye */}
      {tendrils.map((t, i) => (
        <mesh
          key={i}
          position={[Math.cos(t.angle) * 4.5, -1.6 - (i % 2) * 0.5, Math.sin(t.angle) * 4.5]}
          rotation={[Math.PI, 0, Math.sin(t.phase) * 0.5]}
        >
          <coneGeometry args={[0.36, t.len, 6]} />
          <meshStandardMaterial color="#7d2b2b" roughness={0.75} emissive="#3a0808" emissiveIntensity={0.6} />
        </mesh>
      ))}

      <group ref={sclera}>
        {/* Sclera */}
        <mesh castShadow>
          <sphereGeometry args={[4.4, 40, 40]} />
          <meshStandardMaterial
            ref={flashMat}
            color={bloodTint}
            roughness={0.42}
            metalness={0.04}
            emissive="#3a0606"
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Bloodshot veins */}
        <group ref={veins}>
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 3.7, Math.sin(a) * 3.7, 2.15]} rotation={[0, 0, a]}>
                <boxGeometry args={[1.5, 0.1, 0.05]} />
                <meshBasicMaterial color={enraged ? '#e01a1a' : '#5c1010'} transparent opacity={0.72} />
              </mesh>
            );
          })}
        </group>

        {/* Iris + pupil assembly, aimed at the guardians */}
        <group ref={iris} position={[0, 0, 3.6]}>
          <mesh>
            <sphereGeometry args={[1.95, 28, 28]} />
            <meshStandardMaterial color={enraged ? '#ff3838' : '#c02020'} roughness={0.3} emissive={enraged ? '#8a0000' : '#3a0000'} emissiveIntensity={enraged ? 1.3 : 0.6} />
          </mesh>
          <mesh ref={pupil} position={[0, 0, 1.25]}>
            <sphereGeometry args={[1.05, 24, 24]} />
            <meshBasicMaterial ref={pupilMat} color="#1a0505" />
          </mesh>
          {/* catch-light so it reads as a wet eye */}
          <mesh position={[-0.4, 0.45, 1.9]}>
            <sphereGeometry args={[0.26, 10, 10]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
          </mesh>
        </group>
      </group>

      {/* Servant eyes orbiting the core */}
      {[0, 1, 2].map((i) => (
        <Servant key={i} index={i} enraged={enraged} ratio={hpRatio} />
      ))}

      {glow && (
        <sprite scale={enraged ? [20, 20, 1] : [14, 14, 1]}>
          <spriteMaterial
            map={glow}
            transparent
            opacity={enraged ? 0.6 : 0.34}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      )}

      <pointLight
        position={[0, 0, 3]}
        intensity={enraged ? 34 : 14}
        distance={26}
        color={enraged ? '#ff2a2a' : '#ff5a4a'}
      />
    </group>
  );
}

function Servant({ index, enraged, ratio }: { index: number; enraged: boolean; ratio: number }) {
  const ref = useRef<THREE.Group>(null);
  const pupil = useRef<THREE.Mesh>(null);
  const radius = 6.4 + index * 0.7;
  const speed = (enraged ? 1.5 : 0.75) * (index % 2 === 0 ? 1 : -1);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime * speed + index * 2.1;
    g.position.set(Math.cos(t) * radius, Math.sin(t * 1.7) * 1.3, Math.sin(t) * radius * 0.55 - 0.6);
    g.lookAt(0, BOSS_Y, 12);
    if (pupil.current) pupil.current.rotation.z = state.clock.elapsedTime * 2;
  });

  const scale = 0.9 + ratio * 0.2;
  return (
    <group ref={ref} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.62, 16, 16]} />
        <meshStandardMaterial color={enraged ? '#d02020' : '#a03030'} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.3, 14, 14]} />
        <meshBasicMaterial color="#120303" />
      </mesh>
      <mesh ref={pupil} position={[0, 0, 0.64]}>
        <circleGeometry args={[0.16, 8]} />
        <meshBasicMaterial color="#ff9a9a" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
