import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Soft radial sprite used for particle glows, the moon halo and the boss aura.
 *
 * Returns null when a 2D canvas is unavailable, in which case callers fall back
 * to plain untextured meshes instead of rendering nothing.
 */
export function useGlowTexture(color = '#ff4d4d', softness = 0.25) {
  return useMemo(() => {
    try {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const g = canvas.getContext('2d');
      if (!g) return null;
      const grad = g.createRadialGradient(size / 2, size / 2, size * softness * 0.1, size / 2, size / 2, size / 2);
      grad.addColorStop(0, color);
      grad.addColorStop(0.45, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch {
      return null;
    }
  }, [color, softness]);
}

/** Pixel-art stippled grass/dirt texture, generated so no asset download is needed. */
export function useGroundTexture() {
  return useMemo(() => {
    try {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const g = canvas.getContext('2d');
      if (!g) return null;
      g.fillStyle = '#2f5c2a';
      g.fillRect(0, 0, size, size);
      for (let i = 0; i < 2600; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        const s = 4;
        const r = Math.random();
        if (r < 0.55) g.fillStyle = `hsl(${100 + Math.random() * 25}, 42%, ${20 + Math.random() * 16}%)`;
        else if (r < 0.85) g.fillStyle = `hsl(${28 + Math.random() * 14}, 38%, ${16 + Math.random() * 12}%)`;
        else g.fillStyle = '#4a7a38';
        g.fillRect(x, y, s, s);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(14, 14);
      tex.magFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch {
      return null;
    }
  }, []);
}
