import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGlowTexture } from '../../systems/textures';
import { CHARACTERS } from '../../data/characters';
import type { CharacterClass, Player, PlayerAnimState } from '../../game/types';

export function playerWorldPos(slot: number): [number, number, number] {
  return slot === 0 ? [-4.5, 1.4, 6] : [4.5, 1.4, 6];
}

interface GuardianProps {
  player: Player;
  isActive: boolean;
}

/** Blocky, pixel-art-flavoured guardian built from primitives. */
function Guardian({ player, isActive }: GuardianProps) {
  const def = CHARACTERS[player.className];
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const weapon = useRef<THREE.Group>(null);
  const shieldMesh = useRef<THREE.Group>(null);
  const local = useRef({ state: player.animState as PlayerAnimState, t: 0 });

  const glow = useGlowTexture(def.accent, 0.3);
  const position = useMemo(() => playerWorldPos(player.slot), [player.slot]);

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    const time = state.clock.elapsedTime;
    const L = local.current;
    if (L.state !== player.animState) {
      L.state = player.animState;
      L.t = 0;
    }
    L.t += delta;

    let y = 0;
    let rot = 0;
    let scl = 1;
    let lean = 0;

    switch (player.animState) {
      case 'IDLE':
        y = Math.sin(time * 1.7 + player.slot) * 0.07;
        rot = Math.sin(time * 0.55 + player.slot) * 0.09;
        break;
      case 'ATTACK':
      case 'CAST': {
        const t = L.t;
        const k = Math.min(1, t / 0.42);
        const e = Math.sin(k * Math.PI);
        y = e * 0.16;
        lean = -e * 0.22;
        rot = e * 0.18;
        scl = 1 + e * 0.07;
        break;
      }
      case 'HIT': {
        const decay = Math.max(0, 1 - L.t / 0.55);
        rot = Math.sin(L.t * 30) * 0.18 * decay;
        lean = 0.3 * decay;
        y = -0.1 * decay;
        break;
      }
      case 'VICTORY':
        y = Math.abs(Math.sin(L.t * 5)) * 0.4;
        scl = 1 + Math.abs(Math.sin(L.t * 5)) * 0.06;
        break;
      case 'DEFEAT': {
        const k = Math.min(1, L.t / 0.9);
        lean = k * 1.35;
        y = -k * 0.85;
        break;
      }
    }

    g.position.set(position[0], position[1] + y, position[2]);
    g.rotation.y = rot + (isActive ? Math.sin(time * 1.2) * 0.05 : 0);
    g.scale.setScalar(scl);

    if (body.current) {
      body.current.rotation.x = lean;
      body.current.position.y = Math.sin(time * 1.4 + player.slot) * 0.03;
    }

    // Combat pose: swing the weapon arm during attacks, raise it during casts.
    if (armR.current) {
      const t = L.t;
      const swinging = player.animState === 'ATTACK';
      const casting = player.animState === 'CAST';
      const targetRot = swinging
        ? -0.4 - Math.sin(Math.min(1, t / 0.4) * Math.PI) * 2.1
        : casting
          ? -1.9 + Math.sin(time * 3) * 0.14
          : Math.sin(time * 1.5) * 0.1;
      armR.current.rotation.x += (targetRot - armR.current.rotation.x) * 0.24;
    }
    if (weapon.current) {
      weapon.current.visible = player.animState !== 'DEFEAT';
      weapon.current.rotation.z = Math.sin(time * 1.1 + player.slot) * 0.05;
    }

    // Shield flashes while the guardian holds defense from armor cards.
    if (shieldMesh.current) {
      const active = player.defense > CHARACTERS[player.className].baseDefense;
      const pulse = 1 + Math.sin(time * 4) * 0.06;
      shieldMesh.current.scale.setScalar(active ? pulse : 0.001);
      shieldMesh.current.rotation.y = time * 0.8;
      shieldMesh.current.visible = active && player.alive;
    }
  });

  const armorColor =
    player.className === 'melee' ? '#7d7d8a' : player.className === 'mage' ? '#2b3f7a' : player.className === 'ranged' ? '#4b5a34' : '#4a2f6b';

  return (
    <group ref={root} position={position}>
      <group ref={body}>
        {/* Legs */}
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x, 0.35, 0]} castShadow>
            <boxGeometry args={[0.28, 0.7, 0.28]} />
            <meshStandardMaterial color={armorColor} roughness={0.8} />
          </mesh>
        ))}
        {/* Torso */}
        <mesh position={[0, 0.98, 0]} castShadow>
          <boxGeometry args={[0.8, 0.72, 0.46]} />
          <meshStandardMaterial color={armorColor} roughness={0.72} metalness={0.12} />
        </mesh>
        {/* Shoulders / pauldrons */}
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 1.26, 0]} castShadow>
            <boxGeometry args={[0.3, 0.24, 0.4]} />
            <meshStandardMaterial color={def.accent} roughness={0.5} metalness={0.35} />
          </mesh>
        ))}
        {/* Head */}
        <mesh position={[0, 1.56, 0]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.46]} />
          <meshStandardMaterial color="#e0b48c" roughness={0.85} />
        </mesh>
        {/* Helmet / hood / hat */}
        {player.className === 'melee' && (
          <mesh position={[0, 1.78, 0]} castShadow>
            <boxGeometry args={[0.58, 0.26, 0.54]} />
            <meshStandardMaterial color="#9a9aa8" metalness={0.5} roughness={0.35} />
          </mesh>
        )}
        {player.className === 'mage' && (
          <mesh position={[0, 1.82, 0]} castShadow>
            <coneGeometry args={[0.42, 0.6, 8]} />
            <meshStandardMaterial color="#2b3f7a" roughness={0.6} />
          </mesh>
        )}
        {player.className === 'summoner' && (
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[0.36, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#6b3fa0" roughness={0.6} />
          </mesh>
        )}
        {player.className === 'ranged' && (
          <mesh position={[0, 1.82, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.14, 12]} />
            <meshStandardMaterial color="#4b5a34" roughness={0.7} />
          </mesh>
        )}

        {/* Weapon arm */}
        <group ref={armR} position={[0.5, 1.2, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.22, 0.6, 0.22]} />
            <meshStandardMaterial color={armorColor} roughness={0.8} />
          </mesh>
          <group ref={weapon} position={[0, -0.55, 0]}>
            <Weapon className={player.className} />
          </group>
        </group>
        {/* Off hand arm + shield */}
        <group position={[-0.5, 1.2, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.22, 0.6, 0.22]} />
            <meshStandardMaterial color={armorColor} roughness={0.8} />
          </mesh>
          {player.className === 'melee' && (
            <mesh position={[-0.2, -0.42, 0.05]} castShadow>
              <boxGeometry args={[0.14, 0.78, 0.62]} />
              <meshStandardMaterial color="#8f8f9c" metalness={0.55} roughness={0.3} />
            </mesh>
          )}
        </group>
      </group>

      {/* Armor-card shield bubble */}
      <group ref={shieldMesh} position={[0, 1.0, 0]}>
        <mesh>
          <sphereGeometry args={[1.25, 20, 20]} />
          <meshBasicMaterial
            color={def.accent}
            transparent
            opacity={0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.25, 0.035, 8, 40]} />
          <meshBasicMaterial color={def.accent} transparent opacity={0.65} />
        </mesh>
      </group>

      {/* Active-player indicator ring */}
      {isActive && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95, 1.12, 32]} />
          <meshBasicMaterial color={def.accent} transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
      )}

      {glow && player.animState === 'VICTORY' && (
        <sprite scale={[5, 5, 1]} position={[0, 1, 0]}>
          <spriteMaterial map={glow} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}

      <pointLight position={[0, 1.4, 0.8]} intensity={player.animState === 'ATTACK' || player.animState === 'CAST' ? 8 : 2.4} distance={7} color={def.accent} />
    </group>
  );
}

function Weapon({ className }: { className: CharacterClass }) {
  switch (className) {
    case 'melee':
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.28]} />
            <meshStandardMaterial color="#3a2a18" />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.09, 1.5, 0.04]} />
            <meshStandardMaterial color="#d9d9e2" metalness={0.85} roughness={0.18} emissive="#442200" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.42, 0.08, 0.1]} />
            <meshStandardMaterial color="#8a6a2a" metalness={0.6} />
          </mesh>
        </group>
      );
    case 'mage':
    case 'summoner':
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.05, 0.06, 1.7, 8]} />
            <meshStandardMaterial color="#4a3524" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <icosahedronGeometry args={[0.18, 0]} />
            <meshBasicMaterial color={className === 'mage' ? '#7ec8ff' : '#c084fc'} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 0.95, 0]} intensity={2.4} distance={3.6} color={className === 'mage' ? '#7ec8ff' : '#c084fc'} />
        </group>
      );
    case 'ranged':
      return (
        <group rotation={[0, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.45, 0.045, 6, 20, Math.PI]} />
            <meshStandardMaterial color="#6b4a28" roughness={0.85} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.9, 4]} />
            <meshStandardMaterial color="#d8d8d0" />
          </mesh>
        </group>
      );
  }
}

/** The Summoner's minion: spawns, attacks, floats, then fades. */
export function Minion({ ownerSlot, active }: { ownerSlot: number; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const glow = useGlowTexture('#c084fc', 0.3);
  const born = useRef<number | null>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    if (active && born.current === null) born.current = state.clock.elapsedTime;
    if (!active) {
      born.current = null;
      g.visible = false;
      return;
    }
    const age = state.clock.elapsedTime - (born.current ?? state.clock.elapsedTime);
    const spawn = Math.min(1, age / 0.5);
    g.visible = true;
    const base = playerWorldPos(ownerSlot);
    const orbit = state.clock.elapsedTime * 1.6;
    g.position.set(
      base[0] + Math.cos(orbit) * 1.9,
      1.4 + Math.sin(state.clock.elapsedTime * 2.4) * 0.22,
      base[2] - 1.2 + Math.sin(orbit) * 1.0,
    );
    g.scale.setScalar(spawn * (1 + Math.sin(state.clock.elapsedTime * 3) * 0.04));
    g.rotation.y = orbit + Math.PI;
  });

  return (
    <group ref={ref} visible={false}>
      <mesh>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#c084fc" emissive="#5a2a8a" emissiveIntensity={1.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.26]}>
        <circleGeometry args={[0.1, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight intensity={3.4} distance={4.5} color="#c084fc" />
      {glow && (
        <sprite scale={[1.5, 1.5, 1]}>
          <spriteMaterial map={glow} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
    </group>
  );
}

export default Guardian;
