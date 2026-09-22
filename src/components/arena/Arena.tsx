import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGlowTexture, useGroundTexture } from '../../systems/textures';

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 2.2, 7]} />
        <meshStandardMaterial color="#4a3524" roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 2.3 + i * 0.75, 0]} castShadow>
          <coneGeometry args={[1.5 - i * 0.32, 1.25, 7]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#2f6b2c' : '#3c7d35'} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function VillageHouse({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.8, 2]} />
        <meshStandardMaterial color="#6b503a" roughness={1} />
      </mesh>
      <mesh position={[0, 2.15, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.95, 0.95, 4]} />
        <meshStandardMaterial color="#3f2a1d" roughness={1} />
      </mesh>
      <mesh position={[0, 0.75, 1.01]}>
        <planeGeometry args={[0.6, 0.7]} />
        <meshBasicMaterial color="#ffd479" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.75, 1.02]}>
        <planeGeometry args={[0.72, 0.82]} />
        <meshBasicMaterial color="#8a5a20" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Torch({ position }: { position: [number, number, number] }) {
  const flame = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!flame.current) return;
    const t = state.clock.elapsedTime;
    flame.current.scale.setScalar(1 + Math.sin(t * 9 + position[0]) * 0.14);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 1.4, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={1} />
      </mesh>
      <mesh ref={flame} position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.17, 8, 8]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.55, 0]} intensity={2.6} distance={7} color="#ffa040" />
    </group>
  );
}

/** Faint drifting embers rising through the arena. */
function Embers({ count = 140 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const glow = useGlowTexture('#ff6a4d', 0.3);

  const { geometry, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 46;
      positions[i * 3 + 1] = Math.random() * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 46 - 4;
      sp[i] = 0.4 + Math.random() * 1.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, speeds: sp };
  }, [count]);

  useFrame((_, delta) => {
    const pts = points.current;
    if (!pts) return;
    const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.6 + i) * delta * 0.35;
      if (arr[i * 3 + 1] > 22) arr[i * 3 + 1] = -1;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.34}
        map={glow ?? undefined}
        color="#ff7a55"
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

export interface ArenaProps {
  enraged?: boolean;
}

export default function Arena({ enraged = false }: ArenaProps) {
  const ground = useGroundTexture();
  const moonGlow = useGlowTexture('#ff2020', 0.4);

  // A ring of trees and stones framing the battlefield.
  const trees = useMemo(
    () =>
      [
        [-15, -6, 1.15],
        [-11, -11, 0.95],
        [-18, 1, 0.85],
        [-13, 4.5, 1.05],
        [15.5, -7, 1.2],
        [12, -12, 0.9],
        [18.5, 0.5, 1.0],
        [13.5, 5, 0.88],
        [-7, -15, 1.1],
        [7.5, -16, 1.0],
        [0, -18, 0.95],
      ] as [number, number, number][],
    [],
  );

  return (
    <group>
      <color attach="background" args={[enraged ? '#0d0305' : '#120610']} />
      <fog attach="fog" args={[enraged ? '#160406' : '#1b0a12', 22, 62]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          map={ground ?? undefined}
          color={ground ? '#ffffff' : '#2f5c2a'}
          roughness={1}
        />
      </mesh>

      {/* Battle arch framing the boss (subtle structure, filters mud toward the arena) */}
      <mesh position={[0, -0.6, 2.5]} receiveShadow>
        <boxGeometry args={[26, 1.0, 3]} />
        <meshStandardMaterial color="#3d2b1c" roughness={1} />
      </mesh>

      {trees.map((p, i) => (
        <Tree key={i} position={p} scale={p[2]} />
      ))}

      {/* NPC village behind the guardians — "we are defending the village" */}
      <group position={[0, 0, -20]}>
        <VillageHouse position={[-5.5, 0, 1]} rotation={0.35} />
        <VillageHouse position={[0, 0, -0.6]} />
        <VillageHouse position={[5.5, 0, 1.2]} rotation={-0.35} />
        <VillageHouse position={[10.5, 0, -3.4]} rotation={-0.9} scale={0.85} />
        <VillageHouse position={[-10.5, 0, -3]} rotation={0.9} />
        <Torch position={[-2.6, 0, 2.4]} />
        <Torch position={[2.6, 0, 2.4]} />
        <Torch position={[-8.6, 0, 2.0]} />
        <Torch position={[8.6, 0, 2.0]} />
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[13, 32]} />
          <meshStandardMaterial color="#4a3a26" roughness={1} />
        </mesh>
      </group>

      {/* Blood Moon */}
      <group position={[0, 17.5, -40]}>
        <mesh>
          <sphereGeometry args={[6.6, 32, 32]} />
          <meshBasicMaterial color="#c41414" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 2.4]}>
          <sphereGeometry args={[6.0, 24, 24]} />
          <meshBasicMaterial color="#e8361f" toneMapped={false} />
        </mesh>
        {[
          [-2.4, 1.4, 5.0, 1.2],
          [2.2, -1.6, 5.2, 0.9],
          [0.6, 2.9, 4.4, 0.7],
          [-1.6, -3.0, 4.0, 0.55],
          [3.1, 2.0, 3.6, 0.45],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}>
            <circleGeometry args={[r, 16]} />
            <meshBasicMaterial color="#8f0d0d" />
          </mesh>
        ))}
        <pointLight intensity={enraged ? 90 : 55} distance={120} color="#ff3020" />
        {moonGlow && (
          <sprite scale={[34, 34, 1]} position={[0, 0, -1]}>
            <spriteMaterial map={moonGlow} transparent opacity={enraged ? 0.55 : 0.38} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        )}
      </group>

      {/* Lighting: cold moonlight plus warm village torches */}
      <ambientLight intensity={enraged ? 0.2 : 0.28} color="#5b2a3d" />
      <directionalLight
        position={[-14, 22, -18]}
        intensity={enraged ? 1.5 : 1.15}
        color="#ff5a45"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={90}
      />
      <pointLight position={[0, 7, 12]} intensity={0.7} distance={30} color="#ffb060" />

      <Embers count={140} />
    </group>
  );
}
