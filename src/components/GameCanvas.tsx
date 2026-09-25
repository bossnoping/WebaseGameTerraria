import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Arena from './arena/Arena';
import EyeOfCthulhu, { BOSS_HOME } from './boss/EyeOfCthulhu';
import Guardian, { Minion } from './players/Guardian';
import { EffectLayer, FloatingNumbers } from './effects/Effects';
import { useGame } from '../game/GameEngine';
import type { CameraMode } from '../game/types';

const CAMERA_PRESETS: Record<CameraMode, { pos: [number, number, number]; look: [number, number, number] }> = {
  OVERVIEW: { pos: [0, 9.5, 24], look: [0, 6.5, -4] },
  BOSS: { pos: [0, 7.5, 8.5], look: [BOSS_HOME[0], 6.2, BOSS_HOME[2]] },
  PLAYER: { pos: [0, 4.6, 16.5], look: [0, 1.7, 6] },
  ATTACK: { pos: [0, 5.6, 14.5], look: [0, 4.6, -3] },
};

/** Smoothly interpolated camera with shake applied on impacts. */
function CameraRig() {
  const { camera } = useThree();
  const mode = useGame((s) => s.cameraMode);
  const shake = useGame((s) => s.shake);
  const targetPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.OVERVIEW.pos));
  const targetLook = useRef(new THREE.Vector3(...CAMERA_PRESETS.OVERVIEW.look));
  const look = useRef(new THREE.Vector3(...CAMERA_PRESETS.OVERVIEW.look));
  const desired = useRef(new THREE.Vector3());
  const prevMode = useRef<CameraMode>('OVERVIEW');

  useEffect(() => {
    const preset = CAMERA_PRESETS[mode];
    targetPos.current.set(...preset.pos);
    targetLook.current.set(...preset.look);
    prevMode.current = mode;
  }, [mode]);

  useFrame((_, delta) => {
    const speed = mode === prevMode.current ? 1.6 : 2.6;
    const lerp = Math.min(1, delta * speed);
    const jitter = shake > 0.01 ? shake * 0.55 : 0;
    desired.current.set(
      targetPos.current.x + (Math.random() - 0.5) * jitter,
      targetPos.current.y + (Math.random() - 0.5) * jitter,
      targetPos.current.z + (Math.random() - 0.5) * jitter,
    );
    camera.position.lerp(desired.current, lerp);
    look.current.lerp(targetLook.current, lerp);
    camera.lookAt(look.current);
  });
  return null;
}

function SceneContents() {
  const boss = useGame((s) => s.boss);
  const players = useGame((s) => s.players);
  const activePlayerId = useGame((s) => s.activePlayerId);
  const pruneTransients = useGame((s) => s.pruneTransients);
  const summonActive = useGame((s) => s.playedThisTurn.includes('Summon Minion'));

  useFrame(() => pruneTransients());

  const hpRatio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
  const summoner = players.find((p) => p.className === 'summoner');

  return (
    <>
      <CameraRig />
      <Arena enraged={boss.enraged && boss.hp > 0} />

      {boss.hp > 0 || boss.animState === 'DEFEATED' ? (
        <EyeOfCthulhu animState={boss.animState} hpRatio={hpRatio} enraged={boss.enraged} />
      ) : null}

      {players.map((p) => (
        <Guardian key={p.id} player={p} isActive={p.id === activePlayerId} />
      ))}

      {summoner && <Minion ownerSlot={summoner.slot} active={summonActive} />}

      <EffectLayer />
      <FloatingNumbers />
    </>
  );
}

/** Shown only when the browser cannot provide a WebGL context at all. */
function GLFallback() {
  return (
    <div className="webgl-fallback">
      <div>
        <h2>WebGL unavailable</h2>
        <p>The 3D arena needs WebGL. The card battle below is still fully playable.</p>
      </div>
    </div>
  );
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function GameCanvas() {
  const [glOk, setGlOk] = useState(true);
  const enraged = useGame((s) => s.boss.enraged);
  const bossAlive = useGame((s) => s.boss.hp > 0);

  useEffect(() => {
    if (!detectWebGL()) setGlOk(false);
  }, []);

  return (
    <div className={`game-canvas ${enraged && bossAlive ? 'game-canvas--enraged' : ''}`}>
      {glOk ? (
        <Canvas
          shadows
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ position: CAMERA_PRESETS.OVERVIEW.pos, fov: 46, near: 0.1, far: 220 }}
          onError={() => setGlOk(false)}
        >
          <Suspense fallback={null}>
            <SceneContents />
          </Suspense>
        </Canvas>
      ) : (
        <GLFallback />
      )}
    </div>
  );
}
