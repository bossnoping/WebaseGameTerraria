import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGlowTexture } from '../../systems/textures';
import { useGame } from '../../game/GameEngine';
import { Html } from '@react-three/drei';
import type { FloatingNumber, GameEffectEvent } from '../../game/types';

function ExpireAfter({ duration, id }: { duration: number; id: number }) {
  const start = useRef<number | null>(null);
  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    if (state.clock.elapsedTime - start.current > duration) {
      const s = useGame.getState();
      if (s.effects.some((e) => e.id === id)) {
        useGame.setState({ effects: s.effects.filter((e) => e.id !== id) });
      }
    }
  });
  return null;
}

/** Trailing particle burst used by projectiles, slashes, impacts and explosions. */
function Particles({
  count,
  color,
  from,
  to,
  duration,
  spread = 0.6,
  size = 0.22,
}: {
  count: number;
  color: string;
  from: [number, number, number];
  to: [number, number, number];
  duration: number;
  spread?: number;
  size?: number;
}) {
  const points = useRef<THREE.Points>(null);
  const glow = useGlowTexture(color, 0.3);
  const velocities = useMemo(() => {
    const v = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      v[i * 3] = (Math.random() - 0.5) * spread;
      v[i * 3 + 1] = (Math.random() - 0.5) * spread;
      v[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    return v;
  }, [count, spread]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = from[0];
      pos[i * 3 + 1] = from[1];
      pos[i * 3 + 2] = from[2];
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, from]);

  const t = useRef(0);
  useFrame((_, delta) => {
    const pts = points.current;
    if (!pts) return;
    t.current += delta;
    const k = Math.min(1, t.current / duration);
    const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    for (let i = 0; i < count; i++) {
      arr[i * 3] = from[0] + dx * k + velocities[i * 3] * k * 2.2;
      arr[i * 3 + 1] = from[1] + dy * k + velocities[i * 3 + 1] * k * 2.2 + k * k * 1.2;
      arr[i * 3 + 2] = from[2] + dz * k + velocities[i * 3 + 2] * k * 2.2;
    }
    attr.needsUpdate = true;
    const mat = pts.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - k);
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={size}
        map={glow ?? undefined}
        color={color}
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

function Projectile({ e }: { e: GameEffectEvent }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const trail = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    t.current += delta;
    const k = Math.min(1, t.current / e.duration);
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const arc = Math.sin(k * Math.PI) * 2.2;
    if (ref.current) {
      ref.current.position.set(
        e.from[0] + (e.to[0] - e.from[0]) * ease,
        e.from[1] + (e.to[1] - e.from[1]) * ease + arc,
        e.from[2] + (e.to[2] - e.from[2]) * ease,
      );
      ref.current.rotation.x += delta * 12;
      ref.current.rotation.y += delta * 9;
      ref.current.scale.setScalar(1 + Math.sin(t.current * 22) * 0.16);
    }
    const pts = trail.current;
    if (pts) {
      const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < 30; i++) {
        const back = Math.max(0, ease - i * 0.022);
        arr[i * 3] = e.from[0] + (e.to[0] - e.from[0]) * back;
        arr[i * 3 + 1] = e.from[1] + (e.to[1] - e.from[1]) * back + Math.sin(back * Math.PI) * 2.2;
        arr[i * 3 + 2] = e.from[2] + (e.to[2] - e.from[2]) * back;
      }
      attr.needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 0.85 - k * 0.5);
    }
  });

  return (
    <>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshBasicMaterial color={e.color} toneMapped={false} />
        <pointLight intensity={9} distance={6} color={e.color} />
      </mesh>
      <points ref={trail} geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          size={0.36}
          map={useGlowTexture(e.color, 0.3) ?? undefined}
          color={e.color}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </>
  );
}

function Slash({ e }: { e: GameEffectEvent }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    const k = Math.min(1, t.current / e.duration);
    if (ref.current) {
      ref.current.position.set(
        e.from[0] + (e.to[0] - e.from[0]) * k,
        e.from[1] + (e.to[1] - e.from[1]) * k,
        e.from[2] + (e.to[2] - e.from[2]) * k,
      );
      ref.current.rotation.z = k * 6;
      ref.current.scale.setScalar(1 + k * 2.4);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 - k);
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.75, 0.09, 6, 22, Math.PI * 1.25]} />
      <meshBasicMaterial color={e.color} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function TauntLink({ e }: { e: GameEffectEvent }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const points = useMemo(() => {
    const mid: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      mid.push(
        new THREE.Vector3(
          e.from[0] + (e.to[0] - e.from[0]) * k,
          e.from[1] + (e.to[1] - e.from[1]) * k + Math.sin(k * Math.PI) * 1.4,
          e.from[2] + (e.to[2] - e.from[2]) * k,
        ),
      );
    }
    return new THREE.CatmullRomCurve3(mid);
  }, [e.from, e.to]);

  useFrame((_, delta) => {
    t.current += delta;
    const k = Math.min(1, t.current / e.duration);
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(t.current * 12) * 0.3;
      ref.current.scale.setScalar(1 - k * 0.1);
    }
  });

  return (
    <mesh ref={ref}>
      <tubeGeometry args={[points, 24, 0.07, 6, false]} />
      <meshBasicMaterial color={e.color} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function ShieldBurst({ e }: { e: GameEffectEvent }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    const k = Math.min(1, t.current / e.duration);
    if (ref.current) {
      ref.current.scale.setScalar(0.4 + k * 1.6);
      ref.current.rotation.y += delta * 1.6;
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - k * 0.75);
    }
  });
  return (
    <mesh ref={ref} position={e.to}>
      <sphereGeometry args={[0.8, 18, 18]} />
      <meshBasicMaterial color={e.color} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function EffectLayer() {
  const effects = useGame((s) => s.effects);
  return (
    <group>
      {effects.map((e) => {
        const key = `${e.kind}-${e.id}`;
        switch (e.kind) {
          case 'projectile':
            return (
              <group key={key}>
                <ExpireAfter id={e.id} duration={e.duration} />
                <Projectile e={e} />
              </group>
            );
          case 'slash':
            return (
              <group key={key}>
                <ExpireAfter id={e.id} duration={e.duration} />
                <Slash e={e} />
                <Particles count={18} color={e.color} from={e.from} to={e.to} duration={e.duration} spread={1.3} size={0.26} />
              </group>
            );
          case 'taunt':
            return (
              <group key={key}>
                <ExpireAfter id={e.id} duration={e.duration} />
                <TauntLink e={e} />
              </group>
            );
          case 'shield':
          case 'heal':
            return (
              <group key={key}>
                <ExpireAfter id={e.id} duration={e.duration} />
                <ShieldBurst e={e} />
                <Particles count={22} color={e.color} from={e.to} to={e.to} duration={e.duration} spread={1.7} size={0.2} />
              </group>
            );
          case 'summon':
            return (
              <group key={key}>
                <ExpireAfter id={e.id} duration={e.duration} />
                <Particles count={28} color={e.color} from={e.from} to={e.to} duration={e.duration} spread={1.1} size={0.28} />
                <ShieldBurst e={e} />
              </group>
            );
          case 'impact':
            return (
              <group key={key}>
                <ExpireAfter id={e.id} duration={e.duration} />
                <Particles count={40} color={e.color} from={e.to} to={e.to} duration={e.duration} spread={2.4} size={0.3} />
              </group>
            );
          case 'explosion':
            return (
              <group key={key}>
                <ExpireAfter id={e.id} duration={e.duration} />
                <Explosion e={e} />
              </group>
            );
          default:
            return null;
        }
      })}
    </group>
  );
}

function Explosion({ e }: { e: GameEffectEvent }) {
  const t = useRef(0);
  const shell = useRef<THREE.Mesh>(null);
  const glow = useGlowTexture(e.color, 0.3);
  useFrame((_, delta) => {
    t.current += delta;
    if (shell.current) {
      shell.current.scale.setScalar(0.4 + t.current * 6);
      (shell.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - t.current * 0.4);
    }
  });
  return (
    <>
      <mesh ref={shell} position={e.from}>
        <sphereGeometry args={[0.8, 20, 20]} />
        <meshBasicMaterial color={e.color} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <Particles
          key={i}
          count={50}
          color={i === 1 ? '#ffd479' : e.color}
          from={e.from}
          to={[e.from[0], e.from[1] + 3, e.from[2]]}
          duration={1.6 + i * 0.2}
          spread={5.5}
          size={0.42}
        />
      ))}
      <pointLight position={e.from} intensity={60} distance={40} color={e.color} />
      {glow && (
        <sprite position={e.from} scale={[22, 22, 1]}>
          <spriteMaterial map={glow} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
    </>
  );
}

/** Floating damage / heal numbers rendered as HTML billboards. */
export function FloatingNumbers() {
  const floats = useGame((s) => s.floats);
  return (
    <group>
      {floats.map((f) => (
        <FloatLabel key={f.id} f={f} />
      ))}
    </group>
  );
}

function FloatLabel({ f }: { f: FloatingNumber }) {
  const group = useRef<THREE.Group>(null);
  const div = useRef<HTMLDivElement>(null);
  const color =
    f.kind === 'heal' ? '#7ee08a' : f.kind === 'block' ? '#8ad7ff' : f.kind === 'crit' ? '#ffd479' : '#ff6b6b';

  useFrame(() => {
    const elapsed = (performance.now() - f.born) / 1000;
    const rise = Math.min(2.4, elapsed * 2.1);
    if (group.current) group.current.position.y = f.position[1] + rise;
    if (div.current) div.current.style.opacity = String(Math.max(0, 1 - elapsed / 1.5));
  });

  return (
    <group ref={group} position={f.position}>
      <Html center distanceFactor={16} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div
          ref={div}
          className="damage-number"
          style={{
            color,
            textShadow: `0 0 12px ${color}, 0 2px 0 rgba(0,0,0,0.85)`,
          }}
        >
          {f.text}
        </div>
      </Html>
    </group>
  );
}
