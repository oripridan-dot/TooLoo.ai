// @version 2.2.484
// TooLoo.ai Texture Engine
// Dynamic, reactive textures for immersive visual expression
// Textures respond to emotion, interaction, and system state

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { useLiquidEngine, EMOTIONS } from './LiquidEngine';

// ============================================================================
// TEXTURE CONTEXT
// ============================================================================

const TextureEngineContext = createContext(null);

// Texture presets - each has unique visual character
// Note: baseOpacity is multiplied by intensity prop for final visibility
export const TEXTURES = {
  // Organic textures
  noise: {
    name: 'Neural Noise',
    description: 'Subtle organic noise pattern',
    category: 'organic',
    baseOpacity: 0.15,
    scale: 1,
    animated: true,
    emotionResponsive: true,
  },
  grain: {
    name: 'Film Grain',
    description: 'Cinematic film grain effect',
    category: 'organic',
    baseOpacity: 0.2,
    scale: 0.5,
    animated: true,
    emotionResponsive: false,
  },
  perlin: {
    name: 'Perlin Flow',
    description: 'Flowing perlin noise patterns',
    category: 'organic',
    baseOpacity: 0.25,
    scale: 2,
    animated: true,
    emotionResponsive: true,
  },
  cellular: {
    name: 'Cellular',
    description: 'Organic cellular structures',
    category: 'organic',
    baseOpacity: 0.2,
    scale: 1.5,
    animated: true,
    emotionResponsive: true,
  },

  // Geometric textures
  grid: {
    name: 'Neural Grid',
    description: 'Subtle grid overlay',
    category: 'geometric',
    baseOpacity: 0.15,
    scale: 1,
    animated: false,
    emotionResponsive: true,
  },
  dots: {
    name: 'Dot Matrix',
    description: 'Halftone dot pattern',
    category: 'geometric',
    baseOpacity: 0.2,
    scale: 1,
    animated: false,
    emotionResponsive: true,
  },
  hexgrid: {
    name: 'Hex Network',
    description: 'Hexagonal neural network',
    category: 'geometric',
    baseOpacity: 0.15,
    scale: 1.2,
    animated: true,
    emotionResponsive: true,
  },
  circuits: {
    name: 'Circuit Traces',
    description: 'Electronic circuit patterns',
    category: 'geometric',
    baseOpacity: 0.2,
    scale: 1,
    animated: true,
    emotionResponsive: true,
  },

  // Abstract textures
  plasma: {
    name: 'Plasma Field',
    description: 'Dynamic plasma effect',
    category: 'abstract',
    baseOpacity: 0.3,
    scale: 2,
    animated: true,
    emotionResponsive: true,
  },
  waves: {
    name: 'Wave Interference',
    description: 'Interference wave patterns',
    category: 'abstract',
    baseOpacity: 0.25,
    scale: 1.5,
    animated: true,
    emotionResponsive: true,
  },
  aurora: {
    name: 'Aurora Borealis',
    description: 'Northern lights effect',
    category: 'abstract',
    baseOpacity: 0.35,
    scale: 3,
    animated: true,
    emotionResponsive: true,
  },
  nebula: {
    name: 'Nebula Clouds',
    description: 'Cosmic cloud formations',
    category: 'abstract',
    baseOpacity: 0.3,
    scale: 2.5,
    animated: true,
    emotionResponsive: true,
  },

  // State-specific textures
  thinking: {
    name: 'Thought Patterns',
    description: 'Active processing visualization',
    category: 'state',
    baseOpacity: 0.3,
    scale: 1,
    animated: true,
    emotionResponsive: true,
  },
  success: {
    name: 'Success Ripples',
    description: 'Achievement celebration',
    category: 'state',
    baseOpacity: 0.25,
    scale: 1.5,
    animated: true,
    emotionResponsive: false,
  },
  alert: {
    name: 'Alert Pulse',
    description: 'Attention-grabbing pattern',
    category: 'state',
    baseOpacity: 0.35,
    scale: 1,
    animated: true,
    emotionResponsive: false,
  },
};

// ============================================================================
// TEXTURE ENGINE PROVIDER
// ============================================================================

export const TextureEngineProvider = memo(({ children, enabled = true }) => {
  const liquidEngine = useLiquidEngine();
  const [activeTexture, setActiveTexture] = useState('noise');
  const [textureIntensity, setTextureIntensity] = useState(1.0);
  const [textureScale, setTextureScale] = useState(1.0);
  const [blendMode, setBlendMode] = useState('overlay'); // overlay, multiply, screen, soft-light
  const [dynamicTexture, setDynamicTexture] = useState(true);

  // Auto-select texture based on emotion
  useEffect(() => {
    if (!dynamicTexture || !enabled) return;

    const emotionToTexture = {
      neutral: 'noise',
      thinking: 'thinking',
      excited: 'plasma',
      calm: 'waves',
      alert: 'alert',
      creative: 'aurora',
      processing: 'circuits',
      success: 'success',
      error: 'alert',
    };

    const newTexture = emotionToTexture[liquidEngine?.emotion] || 'noise';
    setActiveTexture(newTexture);
  }, [liquidEngine?.emotion, dynamicTexture, enabled]);

  const value = useMemo(
    () => ({
      enabled,
      activeTexture,
      setActiveTexture,
      textureIntensity,
      setTextureIntensity,
      textureScale,
      setTextureScale,
      blendMode,
      setBlendMode,
      dynamicTexture,
      setDynamicTexture,
      TEXTURES,
      // Inherited from liquid engine
      emotion: liquidEngine?.emotion || 'neutral',
      pointer: liquidEngine?.pointer || { x: 0, y: 0 },
      globalPulse: liquidEngine?.globalPulse || 0,
      getEmotionValues: liquidEngine?.getEmotionValues || (() => EMOTIONS.neutral),
    }),
    [
      enabled,
      activeTexture,
      textureIntensity,
      textureScale,
      blendMode,
      dynamicTexture,
      liquidEngine,
    ]
  );

  return <TextureEngineContext.Provider value={value}>{children}</TextureEngineContext.Provider>;
});

TextureEngineProvider.displayName = 'TextureEngineProvider';

// Hook to use texture engine
export const useTextureEngine = () => {
  const context = useContext(TextureEngineContext);
  if (!context) {
    return {
      enabled: false,
      activeTexture: 'noise',
      setActiveTexture: () => {},
      textureIntensity: 1,
      setTextureIntensity: () => {},
      textureScale: 1,
      setTextureScale: () => {},
      blendMode: 'overlay',
      setBlendMode: () => {},
      dynamicTexture: true,
      setDynamicTexture: () => {},
      TEXTURES,
      emotion: 'neutral',
      pointer: { x: 0, y: 0 },
      globalPulse: 0,
      getEmotionValues: () => EMOTIONS.neutral,
    };
  }
  return context;
};

// ============================================================================
// NOISE GENERATOR - Simplex/Perlin noise utilities
// ============================================================================

class SimplexNoise {
  constructor(seed = Math.random()) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);

    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(seed * 256) ^ i;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;

    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const grad3 = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];

    const dot = (g, x, y) => g[0] * x + g[1] * y;

    let n0 = 0,
      n1 = 0,
      n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const gi0 = this.permMod12[ii + this.perm[jj]];
      n0 = t0 * t0 * dot(grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
      n1 = t1 * t1 * dot(grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
      n2 = t2 * t2 * dot(grad3[gi2], x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }
}

// Global noise instance
const simplex = new SimplexNoise();

// ============================================================================
// TEXTURE LAYER - Main canvas-based texture renderer
// ============================================================================

export const TextureLayer = memo(
  ({ texture: textureProp, intensity: intensityProp, scale: scaleProp, className = '' }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const {
      enabled,
      activeTexture,
      textureIntensity,
      textureScale,
      blendMode,
      pointer,
      globalPulse,
      getEmotionValues,
    } = useTextureEngine();

    const texture = textureProp || activeTexture;
    const intensity = intensityProp ?? textureIntensity;
    const scale = scaleProp ?? textureScale;

    useEffect(() => {
      if (!enabled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const textureConfig = TEXTURES[texture] || TEXTURES.noise;

      // Set canvas size
      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);
      };
      resize();
      window.addEventListener('resize', resize);

      let frame = 0;
      const animate = () => {
        frame++;
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;

        ctx.clearRect(0, 0, w, h);

        const emotionVals = getEmotionValues();
        const opacity = textureConfig.baseOpacity * intensity;
        const effectScale = textureConfig.scale * scale;

        // Render texture based on type
        switch (texture) {
          case 'noise':
          case 'grain':
            renderNoise(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'perlin':
            renderPerlin(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'cellular':
            renderCellular(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'grid':
            renderGrid(ctx, w, h, opacity, effectScale, emotionVals);
            break;
          case 'dots':
            renderDots(ctx, w, h, opacity, effectScale, emotionVals);
            break;
          case 'hexgrid':
            renderHexGrid(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'circuits':
            renderCircuits(ctx, w, h, frame, opacity, effectScale, emotionVals, pointer);
            break;
          case 'plasma':
            renderPlasma(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'waves':
            renderWaves(ctx, w, h, frame, opacity, effectScale, emotionVals, pointer);
            break;
          case 'aurora':
            renderAurora(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'nebula':
            renderNebula(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'thinking':
            renderThinking(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'success':
            renderSuccess(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          case 'alert':
            renderAlert(ctx, w, h, frame, opacity, effectScale, emotionVals);
            break;
          default:
            renderNoise(ctx, w, h, frame, opacity, effectScale, emotionVals);
        }

        if (textureConfig.animated) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener('resize', resize);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }, [enabled, texture, intensity, scale, pointer, getEmotionValues]);

    if (!enabled) return null;

    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        style={{
          mixBlendMode: blendMode,
          // Note: opacity is already applied in render functions via baseOpacity * intensity
        }}
      />
    );
  }
);

TextureLayer.displayName = 'TextureLayer';

// ============================================================================
// TEXTURE RENDERERS
// ============================================================================

// Noise texture - organic static
function renderNoise(ctx, w, h, frame, opacity, scale, emotionVals) {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const time = frame * 0.05;

  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random();
    const value = noise * 255;

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = opacity * 255 * (0.5 + noise * 0.5);
  }

  ctx.putImageData(imageData, 0, 0);
}

// Perlin noise - flowing organic patterns
function renderPerlin(ctx, w, h, frame, opacity, scale, emotionVals) {
  const time = frame * 0.01;
  const cellSize = 4 * scale;

  for (let x = 0; x < w; x += cellSize) {
    for (let y = 0; y < h; y += cellSize) {
      const noise = simplex.noise2D(x * 0.01 * scale + time, y * 0.01 * scale + time);
      const value = (noise + 1) / 2;

      ctx.fillStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${value * opacity})`;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

// Cellular texture - voronoi-like cells
function renderCellular(ctx, w, h, frame, opacity, scale, emotionVals) {
  const time = frame * 0.005;
  const cellSize = 60 * scale;
  const points = [];

  // Generate cell centers
  for (let x = 0; x < w + cellSize; x += cellSize) {
    for (let y = 0; y < h + cellSize; y += cellSize) {
      points.push({
        x: x + Math.sin(time + x * 0.01) * 20,
        y: y + Math.cos(time + y * 0.01) * 20,
      });
    }
  }

  // Draw cells
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  for (let px = 0; px < w; px++) {
    for (let py = 0; py < h; py++) {
      let minDist = Infinity;
      let secondDist = Infinity;

      for (const point of points) {
        const dist = Math.sqrt((px - point.x) ** 2 + (py - point.y) ** 2);
        if (dist < minDist) {
          secondDist = minDist;
          minDist = dist;
        } else if (dist < secondDist) {
          secondDist = dist;
        }
      }

      const edge = secondDist - minDist;
      const value = Math.min(1, edge / 30);

      const idx = (py * w + px) * 4;
      const color = value * 255;
      data[idx] = color;
      data[idx + 1] = color;
      data[idx + 2] = color;
      data[idx + 3] = (1 - value) * opacity * 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Grid texture
function renderGrid(ctx, w, h, opacity, scale, emotionVals) {
  const gridSize = 40 * scale;

  ctx.strokeStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${opacity})`;
  ctx.lineWidth = 0.5;

  ctx.beginPath();
  for (let x = 0; x < w; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

// Dots texture - halftone pattern
function renderDots(ctx, w, h, opacity, scale, emotionVals) {
  const dotSpacing = 20 * scale;
  const maxRadius = 3 * scale;

  ctx.fillStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${opacity})`;

  for (let x = dotSpacing / 2; x < w; x += dotSpacing) {
    for (let y = dotSpacing / 2; y < h; y += dotSpacing) {
      const noise = simplex.noise2D(x * 0.05, y * 0.05);
      const radius = maxRadius * (0.3 + (noise + 1) / 2 * 0.7);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Hexagonal grid
function renderHexGrid(ctx, w, h, frame, opacity, scale, emotionVals) {
  const hexSize = 30 * scale;
  const time = frame * 0.02;

  ctx.strokeStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${opacity})`;
  ctx.lineWidth = 0.5;

  const hexHeight = hexSize * Math.sqrt(3);
  const hexWidth = hexSize * 2;

  for (let row = 0; row < h / hexHeight + 1; row++) {
    for (let col = 0; col < w / (hexWidth * 0.75) + 1; col++) {
      const x = col * hexWidth * 0.75;
      const y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0);

      const pulse = Math.sin(time + col * 0.5 + row * 0.3) * 0.3 + 0.7;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        const hx = x + hexSize * pulse * Math.cos(angle);
        const hy = y + hexSize * pulse * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

// Circuit traces
function renderCircuits(ctx, w, h, frame, opacity, scale, emotionVals, pointer) {
  const time = frame * 0.01;
  const gridSize = 30 * scale;

  ctx.strokeStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${opacity})`;
  ctx.lineWidth = 1;

  // Draw traces
  for (let x = gridSize; x < w; x += gridSize) {
    for (let y = gridSize; y < h; y += gridSize) {
      const noise = simplex.noise2D(x * 0.02 + time, y * 0.02);

      if (noise > 0.2) {
        ctx.beginPath();
        ctx.moveTo(x, y);

        // Random direction
        const dir = Math.floor((noise + 1) * 2) % 4;
        switch (dir) {
          case 0:
            ctx.lineTo(x + gridSize, y);
            break;
          case 1:
            ctx.lineTo(x, y + gridSize);
            break;
          case 2:
            ctx.lineTo(x - gridSize, y);
            break;
          case 3:
            ctx.lineTo(x, y - gridSize);
            break;
        }
        ctx.stroke();

        // Node dots
        if (noise > 0.5) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Active trace near pointer
  if (pointer.x > 0 && pointer.y > 0) {
    ctx.strokeStyle = `hsla(${emotionVals.hue}, 100%, 60%, ${opacity * 2})`;
    ctx.lineWidth = 2;

    const nearX = Math.round(pointer.x / gridSize) * gridSize;
    const nearY = Math.round(pointer.y / gridSize) * gridSize;

    ctx.beginPath();
    ctx.arc(nearX, nearY, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Plasma effect
function renderPlasma(ctx, w, h, frame, opacity, scale, emotionVals) {
  const time = frame * 0.02;
  const cellSize = 4;

  for (let x = 0; x < w; x += cellSize) {
    for (let y = 0; y < h; y += cellSize) {
      const v1 = Math.sin(x * 0.02 * scale + time);
      const v2 = Math.sin((y * 0.02 * scale + time) * 1.5);
      const v3 = Math.sin((x * 0.02 * scale + y * 0.02 * scale + time) * 0.5);
      const v4 = Math.sin(Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2) * 0.02 * scale - time);

      const value = (v1 + v2 + v3 + v4) / 4;
      const hue = emotionVals.hue + value * 60;

      ctx.fillStyle = `hsla(${hue}, ${emotionVals.saturation}%, 50%, ${((value + 1) / 2) * opacity})`;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

// Wave interference
function renderWaves(ctx, w, h, frame, opacity, scale, emotionVals, pointer) {
  const time = frame * 0.03;
  const cellSize = 3;

  // Wave centers
  const centers = [
    { x: w * 0.3, y: h * 0.3 },
    { x: w * 0.7, y: h * 0.6 },
    { x: pointer.x || w * 0.5, y: pointer.y || h * 0.5 },
  ];

  for (let x = 0; x < w; x += cellSize) {
    for (let y = 0; y < h; y += cellSize) {
      let value = 0;

      for (const center of centers) {
        const dist = Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2);
        value += Math.sin(dist * 0.05 * scale - time);
      }

      value = value / centers.length;

      ctx.fillStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${((value + 1) / 2) * opacity})`;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

// Aurora borealis
function renderAurora(ctx, w, h, frame, opacity, scale, emotionVals) {
  const time = frame * 0.01;

  for (let y = 0; y < h; y++) {
    const noise1 = simplex.noise2D(y * 0.01 * scale + time, time * 0.5);
    const noise2 = simplex.noise2D(y * 0.02 * scale - time, time * 0.3);

    const x1 = w * 0.3 + noise1 * w * 0.2;
    const x2 = w * 0.7 + noise2 * w * 0.2;

    const gradient = ctx.createLinearGradient(0, y, w, y);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(x1 / w, `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${opacity})`);
    gradient.addColorStop(0.5, `hsla(${emotionVals.hue + 30}, ${emotionVals.saturation}%, 60%, ${opacity * 0.5})`);
    gradient.addColorStop(x2 / w, `hsla(${emotionVals.hue + 60}, ${emotionVals.saturation}%, 50%, ${opacity})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, w, 1);
  }
}

// Nebula clouds
function renderNebula(ctx, w, h, frame, opacity, scale, emotionVals) {
  const time = frame * 0.005;

  for (let i = 0; i < 3; i++) {
    const layerScale = scale * (0.5 + i * 0.3);
    const layerOpacity = opacity * (1 - i * 0.3);

    for (let x = 0; x < w; x += 4) {
      for (let y = 0; y < h; y += 4) {
        const noise = simplex.noise2D(x * 0.01 * layerScale + time + i, y * 0.01 * layerScale + time * 0.7);

        if (noise > 0) {
          const hue = emotionVals.hue + i * 40 + noise * 30;
          ctx.fillStyle = `hsla(${hue}, ${emotionVals.saturation}%, 50%, ${noise * layerOpacity})`;
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }
  }
}

// Thinking pattern - active processing
function renderThinking(ctx, w, h, frame, opacity, scale, emotionVals) {
  const time = frame * 0.05;
  const rings = 5;

  for (let i = 0; i < rings; i++) {
    const radius = ((w + h) / 4) * ((i + 1) / rings);
    const pulseOffset = Math.sin(time + i * 0.5) * 0.3;

    ctx.strokeStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${opacity * (1 - i / rings)})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, radius * (1 + pulseOffset), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rotating segments
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + time;
    const innerR = (w + h) / 8;
    const outerR = (w + h) / 4;

    ctx.beginPath();
    ctx.moveTo(w / 2 + Math.cos(angle) * innerR, h / 2 + Math.sin(angle) * innerR);
    ctx.lineTo(w / 2 + Math.cos(angle) * outerR, h / 2 + Math.sin(angle) * outerR);
    ctx.strokeStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${opacity * Math.abs(Math.sin(time + i))})`;
    ctx.stroke();
  }
}

// Success ripples
function renderSuccess(ctx, w, h, frame, opacity, scale, emotionVals) {
  const time = frame * 0.03;
  const ripples = 5;

  for (let i = 0; i < ripples; i++) {
    const progress = ((time + i * 0.3) % 1);
    const radius = progress * Math.max(w, h) * 0.8;
    const alpha = (1 - progress) * opacity;

    ctx.strokeStyle = `hsla(145, 80%, 50%, ${alpha})`;
    ctx.lineWidth = 3 * (1 - progress);

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Alert pulse
function renderAlert(ctx, w, h, frame, opacity, scale, emotionVals) {
  const time = frame * 0.1;
  const pulse = Math.sin(time) * 0.5 + 0.5;

  // Pulsing vignette
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.7, `hsla(0, 90%, 50%, ${opacity * pulse * 0.3})`);
  gradient.addColorStop(1, `hsla(0, 90%, 40%, ${opacity * pulse * 0.5})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Corner flashes
  const corners = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  corners.forEach(([x, y], i) => {
    const flash = Math.sin(time * 2 + i) * 0.5 + 0.5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 100);
    grad.addColorStop(0, `hsla(0, 90%, 50%, ${opacity * flash * 0.4})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 100, y - 100, 200, 200);
  });
}

// ============================================================================
// TEXTURE OVERLAY - Simple CSS-based texture for performance
// ============================================================================

export const TextureOverlay = memo(
  ({ texture = 'noise', opacity = 0.03, blendMode = 'overlay', className = '' }) => {
    const { enabled, getEmotionValues } = useTextureEngine();

    if (!enabled) return null;

    const emotionVals = getEmotionValues();

    // SVG-based textures for better performance
    const getTextureSVG = () => {
      switch (texture) {
        case 'dots':
          return `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='1' fill='hsl(${emotionVals.hue}, ${emotionVals.saturation}%25, 50%25)'/%3E%3C/svg%3E")`;
        case 'grid':
          return `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='hsl(${emotionVals.hue}, ${emotionVals.saturation}%25, 50%25)' stroke-width='0.5'/%3E%3C/svg%3E")`;
        case 'noise':
        default:
          return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;
      }
    };

    return (
      <div
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{
          backgroundImage: getTextureSVG(),
          backgroundRepeat: 'repeat',
          mixBlendMode: blendMode,
          opacity: opacity,
        }}
      />
    );
  }
);

TextureOverlay.displayName = 'TextureOverlay';

// ============================================================================
// REACTIVE TEXTURE SURFACE - Texture that responds to pointer
// ============================================================================

export const ReactiveTextureSurface = memo(
  ({
    children,
    texture = 'noise',
    intensity = 0.5,
    pointerInfluence = 100,
    className = '',
    style = {},
  }) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const { enabled, pointer, getEmotionValues, globalPulse } = useTextureEngine();
    const [localPointer, setLocalPointer] = useState({ x: 0, y: 0, inside: false });

    // Track pointer relative to element
    useEffect(() => {
      if (!enabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = pointer.x - rect.left;
      const y = pointer.y - rect.top;
      const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

      setLocalPointer({ x, y, inside });
    }, [enabled, pointer.x, pointer.y]);

    // Render reactive texture
    useEffect(() => {
      if (!enabled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);
      };
      resize();

      let frame = 0;
      const animate = () => {
        frame++;
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;

        ctx.clearRect(0, 0, w, h);

        const emotionVals = getEmotionValues();

        // Reactive distortion around pointer
        if (localPointer.inside) {
          const gradient = ctx.createRadialGradient(
            localPointer.x,
            localPointer.y,
            0,
            localPointer.x,
            localPointer.y,
            pointerInfluence
          );
          gradient.addColorStop(
            0,
            `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${intensity * 0.3})`
          );
          gradient.addColorStop(0.5, `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${intensity * 0.1})`);
          gradient.addColorStop(1, 'transparent');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(localPointer.x, localPointer.y, pointerInfluence * (1 + globalPulse * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }

        // Ambient texture noise
        const time = frame * 0.02;
        for (let i = 0; i < 50; i++) {
          const x = simplex.noise2D(i * 0.1, time) * w * 0.5 + w * 0.5;
          const y = simplex.noise2D(i * 0.1 + 100, time) * h * 0.5 + h * 0.5;
          const size = 2 + simplex.noise2D(i, time) * 2;

          ctx.fillStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${intensity * 0.1})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }, [enabled, localPointer, intensity, pointerInfluence, getEmotionValues, globalPulse]);

    return (
      <div ref={containerRef} className={`relative ${className}`} style={style}>
        {enabled && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ mixBlendMode: 'overlay' }}
          />
        )}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

ReactiveTextureSurface.displayName = 'ReactiveTextureSurface';

// ============================================================================
// TEXTURE PRESETS - Quick texture configurations
// ============================================================================

export const TexturePresets = {
  // Minimal - subtle noise only
  minimal: {
    texture: 'noise',
    intensity: 0.5,
    scale: 1,
    blendMode: 'overlay',
  },

  // Immersive - rich layered textures
  immersive: {
    texture: 'plasma',
    intensity: 1,
    scale: 1.5,
    blendMode: 'soft-light',
  },

  // Technical - circuit-like patterns
  technical: {
    texture: 'circuits',
    intensity: 0.8,
    scale: 1,
    blendMode: 'overlay',
  },

  // Organic - flowing natural patterns
  organic: {
    texture: 'perlin',
    intensity: 0.7,
    scale: 2,
    blendMode: 'overlay',
  },

  // Cosmic - space-like atmosphere
  cosmic: {
    texture: 'nebula',
    intensity: 1,
    scale: 2,
    blendMode: 'screen',
  },

  // Focused - minimal distraction
  focused: {
    texture: 'grain',
    intensity: 0.3,
    scale: 0.5,
    blendMode: 'overlay',
  },
};

// ============================================================================
// CSS STYLES INJECTION
// ============================================================================

const injectTextureStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('texture-engine-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'texture-engine-styles';
  styles.textContent = `
    .texture-scanlines {
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.1) 2px,
        rgba(0, 0, 0, 0.1) 4px
      );
    }

    .texture-noise-overlay {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    .texture-gradient-mesh {
      background: 
        radial-gradient(at 40% 20%, hsla(200, 100%, 50%, 0.1) 0px, transparent 50%),
        radial-gradient(at 80% 0%, hsla(260, 100%, 50%, 0.1) 0px, transparent 50%),
        radial-gradient(at 0% 50%, hsla(180, 100%, 50%, 0.1) 0px, transparent 50%),
        radial-gradient(at 80% 50%, hsla(340, 100%, 50%, 0.1) 0px, transparent 50%),
        radial-gradient(at 0% 100%, hsla(220, 100%, 50%, 0.1) 0px, transparent 50%);
    }
  `;
  document.head.appendChild(styles);
};

// Auto-inject styles
if (typeof window !== 'undefined') {
  injectTextureStyles();
}

export default {
  TextureEngineProvider,
  useTextureEngine,
  TextureLayer,
  TextureOverlay,
  ReactiveTextureSurface,
  TexturePresets,
  TEXTURES,
};
