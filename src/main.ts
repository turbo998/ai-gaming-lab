import {
  createInitialStageState,
  stepStageState,
  computeHudSummary,
  STAGE_CARS,
  STORY_NODES,
  type StageState,
  type StageTabId,
  type WananCarId,
  type EchoPresetId,
} from './stage-engine';

declare global {
  interface Window {
    __labStage?: {
      getState: () => StageState;
      setTab: (tab: StageTabId) => void;
      setCar: (car: WananCarId) => void;
      toggleWanan: (key: keyof StageState['wanan']) => void;
      toggleScrap: (key: keyof StageState['scrap']) => void;
      setEchoPreset: (preset: EchoPresetId) => void;
      advanceStoryNode: () => void;
      stepFrames: (count: number) => StageState;
    };
  }
}

const state = createInitialStageState();
const canvas = document.getElementById('benchmark-stage') as HTMLCanvasElement | null;
const ctx = canvas ? canvas.getContext('2d') : null;

const hudLeft = document.getElementById('stage-hud-left');
const hudRight = document.getElementById('stage-hud-right');

let audioCtx: AudioContext | null = null;
let oscNode: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

function syncAudioSynth() {
  if (!state.echo.webAudioSynth) {
    if (gainNode && audioCtx) {
      gainNode.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.04);
    }
    return;
  }
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
      oscNode = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();
      oscNode.type = 'sawtooth';
      oscNode.frequency.value = 110;
      gainNode.gain.value = 0.02;
      oscNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscNode.start();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => {});
    }
    if (oscNode && gainNode) {
      const baseFreq = state.echoPreset === 'shanghai' ? 142 : state.echoPreset === 'ironcrown' ? 92 : 196;
      const mod = Math.sin(state.simTimeSec * 4) * 18;
      oscNode.frequency.setTargetAtTime(baseFreq + mod, audioCtx.currentTime, 0.05);
      gainNode.gain.setTargetAtTime(state.echo.tunnelReverb ? 0.025 : 0.015, audioCtx.currentTime, 0.05);
    }
  } catch {
    // Headless or restricted audio device fallback
  }
}

function getThemePalette() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return isDark
    ? {
        bgTop: '#1d1c1c',
        bgBottom: '#2d2b2a',
        grid: 'rgba(253, 142, 161, 0.14)',
        text: '#ececec',
        muted: '#a6a6a6',
        accent: '#fd8ea1',
        accentSecondary: '#38bdf8',
        gold: '#fbbf24',
        emerald: '#4ade80',
        danger: '#f87171',
        carBody: '#2563eb',
        carBodyHighlight: '#60a5fa',
        carGlass: 'rgba(148, 197, 255, 0.42)',
        panelBg: 'rgba(30, 30, 30, 0.86)',
        panelBorder: '#4e4e4e',
      }
    : {
        bgTop: '#f3efe8',
        bgBottom: '#e5dfd5',
        grid: 'rgba(177, 31, 75, 0.13)',
        text: '#1f1f1f',
        muted: '#5a5a5a',
        accent: '#b11f4b',
        accentSecondary: '#0284c7',
        gold: '#d97706',
        emerald: '#15803d',
        danger: '#dc2626',
        carBody: '#1d4ed8',
        carBodyHighlight: '#3b82f6',
        carGlass: 'rgba(56, 189, 248, 0.34)',
        panelBg: 'rgba(255, 255, 255, 0.88)',
        panelBorder: '#cfcfcf',
      };
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function project3D(
  pt: Vec3,
  yaw: number,
  pitch: number,
  roll: number,
  cx: number,
  cy: number,
  scale: number
): { x: number; y: number; depth: number } {
  // Roll around Z (forward axis X, lateral Z, vertical Y)
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const y1 = pt.y * cr - pt.z * sr;
  const z1 = pt.y * sr + pt.z * cr;

  // Pitch around lateral axis
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x2 = pt.x * cp - y1 * sp;
  const y2 = pt.x * sp + y1 * cp;

  // Yaw around vertical axis
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const x3 = x2 * cyaw + z1 * syaw;
  const z3 = -x2 * syaw + z1 * cyaw;

  const camDist = 6.2;
  const persp = camDist / Math.max(2.2, camDist + z3);
  return {
    x: cx + x3 * scale * persp,
    y: cy - y2 * scale * persp,
    depth: z3,
  };
}

function renderWananStage(c: CanvasRenderingContext2D, w: number, h: number) {
  const pal = getThemePalette();
  const car = STAGE_CARS[state.selectedCar];
  const t = state.simTimeSec;

  // Background gradient + highway horizon
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, pal.bgTop);
  grad.addColorStop(1, pal.bgBottom);
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);

  // Perspective highway grid & Lupu bridge arch silhouette
  const horizonY = h * 0.42;
  c.strokeStyle = pal.grid;
  c.lineWidth = 1;
  c.beginPath();
  for (let i = -8; i <= 8; i++) {
    const topX = w * 0.5 + i * 32;
    const botX = w * 0.5 + i * 145 - ((t * 120) % 145) * 0.25;
    c.moveTo(topX, horizonY);
    c.lineTo(botX, h);
  }
  for (let r = 0; r < 8; r++) {
    const frac = ((r / 8 + (t * 0.45) % (1 / 8)) % 1);
    const y = horizonY + Math.pow(frac, 1.7) * (h - horizonY);
    c.moveTo(0, y);
    c.lineTo(w, y);
  }
  c.stroke();

  // Shanghai Lupu Bridge arch silhouette in background
  c.strokeStyle = pal.accent;
  c.globalAlpha = 0.28;
  c.lineWidth = 2;
  c.beginPath();
  for (let x = w * 0.12; x <= w * 0.88; x += 12) {
    const u = (x - w * 0.5) / (w * 0.38);
    const archY = horizonY - (1 - u * u) * 95;
    if (x === w * 0.12) c.moveTo(x, archY);
    else c.lineTo(x, archY);
  }
  c.stroke();
  c.globalAlpha = 1;

  // Suspension pitch/dive and cornering roll calculation
  const suspPitch = state.wanan.suspensionDynamics ? Math.sin(t * 2.6) * 0.055 : 0;
  const suspRoll = state.wanan.suspensionDynamics ? Math.cos(t * 1.9) * 0.085 : 0;
  const heaveY = state.wanan.suspensionDynamics ? Math.sin(t * 5.2) * 0.04 : 0;
  const yaw = -0.52 + Math.sin(t * 0.45) * 0.16;

  const cx = w * 0.48;
  const cy = h * 0.64;
  const scale = Math.min(w, h) * 0.34;

  const L = 2.15 * car.lengthScale;
  const W = 0.92 * car.widthScale;
  const H = 0.42;
  const cabH = H + car.cabinHeight;

  // Define parametric 3D profile vertices
  const pts: Record<string, Vec3> = {
    fl_low: { x: -L, y: 0.12 + heaveY, z: W },
    fr_low: { x: -L, y: 0.12 + heaveY, z: -W },
    fl_nose: { x: -L * 0.96, y: 0.34 + car.noseSlope * 0.2 + heaveY, z: W * 0.94 },
    fr_nose: { x: -L * 0.96, y: 0.34 + car.noseSlope * 0.2 + heaveY, z: -W * 0.94 },
    fl_cowl: { x: -L * 0.38, y: H + 0.12 + heaveY, z: W },
    fr_cowl: { x: -L * 0.38, y: H + 0.12 + heaveY, z: -W },
    fl_roof: { x: -L * 0.08, y: cabH + heaveY, z: W * 0.82 },
    fr_roof: { x: -L * 0.08, y: cabH + heaveY, z: -W * 0.82 },
    rl_roof: { x: L * 0.42, y: cabH - 0.04 + heaveY, z: W * 0.8 },
    rr_roof: { x: L * 0.42, y: cabH - 0.04 + heaveY, z: -W * 0.8 },
    rl_deck: { x: L * 0.96, y: H + 0.16 + heaveY, z: W * 0.92 },
    rr_deck: { x: L * 0.96, y: H + 0.16 + heaveY, z: -W * 0.92 },
    rl_low: { x: L, y: 0.16 + heaveY, z: W },
    rr_low: { x: L, y: 0.16 + heaveY, z: -W },
    wing_l: { x: L * 0.94, y: H + 0.16 + car.wingHeight + heaveY, z: W * 0.88 },
    wing_r: { x: L * 0.94, y: H + 0.16 + car.wingHeight + heaveY, z: -W * 0.88 },
  };

  const p = (k: string) => project3D(pts[k], yaw, suspPitch, suspRoll, cx, cy, scale);

  const poly = (keys: string[], fill: string, stroke: string, lineWidth = 1.6) => {
    c.beginPath();
    keys.forEach((k, idx) => {
      const pt = p(k);
      if (idx === 0) c.moveTo(pt.x, pt.y);
      else c.lineTo(pt.x, pt.y);
    });
    c.closePath();
    if (!state.wanan.wireframeTopology) {
      c.fillStyle = fill;
      c.fill();
    }
    c.strokeStyle = stroke;
    c.lineWidth = lineWidth;
    c.stroke();
  };

  // Draw chassis shadow on asphalt
  const s1 = p('fl_low');
  const s2 = p('fr_low');
  const s3 = p('rr_low');
  const s4 = p('rl_low');
  c.fillStyle = 'rgba(0, 0, 0, 0.32)';
  c.beginPath();
  c.moveTo(s1.x, s1.y + 18);
  c.lineTo(s2.x, s2.y + 18);
  c.lineTo(s3.x, s3.y + 18);
  c.lineTo(s4.x, s4.y + 18);
  c.closePath();
  c.fill();

  const bodyColors: Record<WananCarId, { main: string; side: string; stroke: string }> = {
    fd3s: { main: '#f59e0b', side: '#d97706', stroke: '#fef3c7' },
    bnr34: { main: '#2563eb', side: '#1d4ed8', stroke: '#bfdbfe' },
    na1: { main: '#dc2626', side: '#b91c1c', stroke: '#fecaca' },
  };
  const bc = bodyColors[state.selectedCar];
  const strokeCol = state.wanan.wireframeTopology ? pal.accentSecondary : bc.stroke;

  // Main parametric surfaces
  poly(['fl_nose', 'fr_nose', 'fr_cowl', 'fl_cowl'], bc.main, strokeCol);
  poly(['fl_cowl', 'fr_cowl', 'fr_roof', 'fl_roof'], pal.carGlass, strokeCol);
  poly(['fl_roof', 'fr_roof', 'rr_roof', 'rl_roof'], bc.main, strokeCol);
  poly(['rl_roof', 'rr_roof', 'rr_deck', 'rl_deck'], pal.carGlass, strokeCol);
  poly(['fl_low', 'fl_nose', 'fl_cowl', 'rl_deck', 'rl_low'], bc.side, strokeCol);
  poly(['fl_cowl', 'fl_roof', 'rl_roof', 'rl_deck'], pal.carGlass, strokeCol);
  poly(['rl_deck', 'rr_deck', 'rr_low', 'rl_low'], bc.side, strokeCol);

  // Rear Wing
  const wl = p('wing_l');
  const wr = p('wing_r');
  const dl = p('rl_deck');
  const dr = p('rr_deck');
  c.strokeStyle = strokeCol;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(dl.x, dl.y);
  c.lineTo(wl.x, wl.y);
  c.lineTo(wr.x, wr.y);
  c.lineTo(dr.x, dr.y);
  c.stroke();

  // Open Wheel Arches & Wheels + Glowing Brake Rotors
  const wheelXs = [-L * 0.62, L * 0.62];
  for (const wx of wheelXs) {
    const wc = project3D({ x: wx, y: 0.22 + heaveY, z: W * 1.02 }, yaw, suspPitch, suspRoll, cx, cy, scale);
    const radius = 28;
    // Open wheel arch cutout arc
    c.strokeStyle = state.wanan.wireframeTopology ? pal.emerald : '#111827';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(wc.x, wc.y, radius + 6, Math.PI, 0);
    c.stroke();

    // Tire & rim
    c.fillStyle = '#18181b';
    c.beginPath();
    c.arc(wc.x, wc.y, radius, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#9ca3af';
    c.lineWidth = 2;
    c.stroke();

    // Glowing brake rotor when exhaustAndRotors active
    if (state.wanan.exhaustAndRotors) {
      const glow = 0.55 + 0.35 * Math.sin(t * 8);
      c.strokeStyle = `rgba(249, 115, 22, ${glow})`;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(wc.x, wc.y, radius * 0.58, 0, Math.PI * 2);
      c.stroke();
    }

    // Rotating wheel spokes
    const spokeAngle = t * 14;
    c.strokeStyle = '#e5e7eb';
    c.lineWidth = 1.6;
    for (let s = 0; s < 5; s++) {
      const a = spokeAngle + (s * Math.PI * 2) / 5;
      c.beginPath();
      c.moveTo(wc.x, wc.y);
      c.lineTo(wc.x + Math.cos(a) * (radius * 0.78), wc.y + Math.sin(a) * (radius * 0.78));
      c.stroke();
    }
  }

  // Pop-up Headlights Actuation & Beam Cones
  if (state.wanan.popupLights) {
    const openRatio = car.hasPopups ? 0.65 + 0.35 * Math.sin(t * 2.2) : 1.0;
    const podHeight = car.hasPopups ? 0.16 * openRatio : 0.05;
    const lampL = project3D({ x: -L * 0.92, y: 0.38 + podHeight + heaveY, z: W * 0.68 }, yaw, suspPitch, suspRoll, cx, cy, scale);
    const lampR = project3D({ x: -L * 0.92, y: 0.38 + podHeight + heaveY, z: -W * 0.68 }, yaw, suspPitch, suspRoll, cx, cy, scale);

    // Pop-up housing
    c.fillStyle = '#fef08a';
    c.strokeStyle = pal.accent;
    c.lineWidth = 2;
    for (const lp of [lampL, lampR]) {
      c.beginPath();
      c.rect(lp.x - 9, lp.y - 7, 18, 14);
      c.fill();
      c.stroke();

      // Volumetric beam cone
      const beamGrad = c.createLinearGradient(lp.x, lp.y, lp.x - 210, lp.y + 75);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      c.fillStyle = beamGrad;
      c.beginPath();
      c.moveTo(lp.x, lp.y);
      c.lineTo(lp.x - 220, lp.y + 42);
      c.lineTo(lp.x - 190, lp.y + 98);
      c.closePath();
      c.fill();
    }
  }

  // Twin-turbo Exhaust Backfire (Blue-Violet Flame Plumes)
  if (state.wanan.exhaustAndRotors) {
    const ex1 = project3D({ x: L * 1.02, y: 0.20 + heaveY, z: W * 0.52 }, yaw, suspPitch, suspRoll, cx, cy, scale);
    const ex2 = project3D({ x: L * 1.02, y: 0.20 + heaveY, z: -W * 0.32 }, yaw, suspPitch, suspRoll, cx, cy, scale);
    const flameLen = 36 + Math.abs(Math.sin(t * 19)) * 48;
    for (const ex of [ex1, ex2]) {
      const fGrad = c.createLinearGradient(ex.x, ex.y, ex.x + flameLen, ex.y - 8);
      fGrad.addColorStop(0, '#ffffff');
      fGrad.addColorStop(0.35, '#38bdf8');
      fGrad.addColorStop(0.75, '#818cf8');
      fGrad.addColorStop(1, 'rgba(129, 140, 248, 0)');
      c.fillStyle = fGrad;
      c.beginPath();
      c.moveTo(ex.x, ex.y - 6);
      c.lineTo(ex.x + flameLen, ex.y - 4);
      c.lineTo(ex.x, ex.y + 6);
      c.closePath();
      c.fill();
    }
  }

  // Wireframe Topology Vertex & Normal Vectors Inspection Overlay
  if (state.wanan.wireframeTopology) {
    c.fillStyle = pal.emerald;
    c.strokeStyle = pal.emerald;
    c.lineWidth = 1.2;
    Object.values(pts).forEach((v) => {
      const proj = project3D(v, yaw, suspPitch, suspRoll, cx, cy, scale);
      const normTip = project3D({ x: v.x, y: v.y + 0.16, z: v.z }, yaw, suspPitch, suspRoll, cx, cy, scale);
      c.beginPath();
      c.arc(proj.x, proj.y, 3.2, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(proj.x, proj.y);
      c.lineTo(normTip.x, normTip.y);
      c.stroke();
    });
  }

  // Right-side live mechanical telemetry panel
  const panelX = w - 330;
  const panelY = 86;
  c.fillStyle = pal.panelBg;
  c.strokeStyle = pal.panelBorder;
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(panelX, panelY, 306, 188, 12);
  c.fill();
  c.stroke();

  c.fillStyle = pal.accent;
  c.font = 'bold 12px Consolas, monospace';
  c.fillText(`TELEMETRY // ${car.name}`, panelX + 16, panelY + 26);

  c.fillStyle = pal.text;
  c.font = '12px Consolas, monospace';
  const pitchDeg = (suspPitch * (180 / Math.PI)).toFixed(2);
  const rollDeg = (suspRoll * (180 / Math.PI)).toFixed(2);
  const lines = [
    `尺寸锚点: ${car.dimensions}`,
    `驱动布局: ${car.layout}`,
    `跳灯铰链: ${state.wanan.popupLights ? (car.hasPopups ? 'OPEN 38.0° (Actuated)' : 'FIXED BEAM ON') : 'CLOSED 0.0°'}`,
    `悬挂姿态: Pitch ${pitchDeg}° | Roll ${rollDeg}°`,
    `排气/制动: ${state.wanan.exhaustAndRotors ? 'ALS 回火激燃 | 盘温 680°C' : '巡航稳态 | 盘温 210°C'}`,
    `拓扑模式: ${state.wanan.wireframeTopology ? 'WIREFRAME + ARCH CUTOUT' : 'PBR SURFACE + CLEARCOAT'}`,
  ];
  lines.forEach((line, idx) => {
    c.fillText(line, panelX + 16, panelY + 52 + idx * 22);
  });
}

function renderScrapStage(c: CanvasRenderingContext2D, w: number, h: number) {
  const pal = getThemePalette();
  const t = state.simTimeSec;

  // Impact Frame (stark black-and-white flash burst) when animeCutInImpact is toggled on
  const isImpactFlash = state.scrap.animeCutInImpact && Math.sin(t * 5.5) > 0.72;

  if (isImpactFlash) {
    c.fillStyle = '#09090b';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#fafafa';
    c.lineWidth = 2.2;
    const burstCx = w * 0.5;
    const burstCy = h * 0.54;
    for (let i = 0; i < 36; i++) {
      const ang = (i * Math.PI * 2) / 36 + t * 2;
      c.beginPath();
      c.moveTo(burstCx + Math.cos(ang) * 75, burstCy + Math.sin(ang) * 75);
      c.lineTo(burstCx + Math.cos(ang) * 620, burstCy + Math.sin(ang) * 620);
      c.stroke();
    }
  } else {
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, pal.bgTop);
    grad.addColorStop(1, pal.bgBottom);
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    // Arena hazard stripes & tactical floor grid
    c.strokeStyle = pal.grid;
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 48) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 0; y < h; y += 48) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
  }

  const r17X = w * 0.29 + (state.scrap.coreDashOverdrive ? Math.sin(t * 3.2) * 34 : 0);
  const r17Y = h * 0.62 + Math.sin(t * 6.5) * 5;

  // Core Dash Afterimages & Golden Overdrive Aura
  if (state.scrap.coreDashOverdrive) {
    for (let ghost = 3; ghost >= 1; ghost--) {
      const gx = r17X - ghost * 38;
      const gy = r17Y + ghost * 3;
      c.fillStyle = ghost % 2 === 0 ? 'rgba(56, 189, 248, 0.20)' : 'rgba(251, 191, 36, 0.22)';
      c.beginPath();
      c.roundRect(gx - 46, gy - 68, 92, 110, 12);
      c.fill();
    }

    // Golden Overdrive Aura ring
    c.strokeStyle = isImpactFlash ? '#ffffff' : pal.gold;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(r17X, r17Y - 16, 86 + Math.sin(t * 10) * 6, 0, Math.PI * 2);
    c.stroke();
  }

  // R-17 Caterpillar Tracks & Sprocket Wheels
  c.fillStyle = isImpactFlash ? '#ffffff' : '#27272a';
  c.strokeStyle = isImpactFlash ? '#ffffff' : pal.accentSecondary;
  c.lineWidth = 2.5;
  c.beginPath();
  c.roundRect(r17X - 58, r17Y + 26, 116, 34, 14);
  c.fill();
  c.stroke();

  for (const wx of [r17X - 34, r17X, r17X + 34]) {
    c.beginPath();
    c.arc(wx, r17Y + 43, 11, 0, Math.PI * 2);
    c.stroke();
  }

  // R-17 Articulated Torso & Shoulder Radiator Fins
  c.fillStyle = isImpactFlash ? '#18181b' : '#0284c7';
  c.strokeStyle = isImpactFlash ? '#ffffff' : '#bae6fd';
  c.lineWidth = 2.5;
  c.beginPath();
  c.roundRect(r17X - 44, r17Y - 54, 88, 78, 12);
  c.fill();
  c.stroke();

  // Shoulder radiator wings (open during overdrive)
  const wingSpread = state.scrap.coreDashOverdrive ? 26 + Math.sin(t * 7) * 5 : 8;
  c.fillStyle = isImpactFlash ? '#ffffff' : pal.gold;
  c.beginPath();
  c.moveTo(r17X - 44, r17Y - 46);
  c.lineTo(r17X - 44 - wingSpread, r17Y - 74);
  c.lineTo(r17X - 24, r17Y - 54);
  c.closePath();
  c.fill();

  // Left Arm: Rotating Magnetic Shield Coil
  const shieldX = r17X - 56;
  const shieldY = r17Y - 12;
  c.strokeStyle = isImpactFlash ? '#ffffff' : '#38bdf8';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(shieldX, shieldY, 24, t * 4, t * 4 + Math.PI * 1.45);
  c.stroke();

  // Right Arm: 3-Stage Hydraulic Rivet Cannon + Recoil Piston + Shell Ejection
  const recoilOffset = state.scrap.hydraulicRecoil ? Math.abs(Math.sin(t * 12)) * 18 : 0;
  const gunX = r17X + 42 - recoilOffset;
  const gunY = r17Y - 22;
  c.fillStyle = isImpactFlash ? '#ffffff' : '#f59e0b';
  c.strokeStyle = '#fef3c7';
  c.beginPath();
  c.roundRect(gunX, gunY - 12, 68, 24, 6);
  c.fill();
  c.stroke();

  if (state.scrap.hydraulicRecoil) {
    // Muzzle flash & rivet projectile stream
    c.fillStyle = isImpactFlash ? '#ffffff' : '#fde047';
    c.beginPath();
    c.arc(gunX + 76, gunY, 10 + (recoilOffset % 8), 0, Math.PI * 2);
    c.fill();

    // Ejected spinning brass shell casings
    for (let s = 0; s < 4; s++) {
      const age = ((t * 3.5 + s * 0.25) % 1);
      const sx = gunX + 18 - age * 64;
      const sy = gunY - 16 - Math.sin(age * Math.PI) * 48 + age * age * 55;
      c.save();
      c.translate(sx, sy);
      c.rotate(age * 14);
      c.fillStyle = '#fbbf24';
      c.fillRect(-5, -2.5, 10, 5);
      c.restore();
    }
  }

  // Boss: Champion "Iron-Crown Hector" (铁冠·赫克托) on the right
  const bossX = w * 0.73;
  const bossY = h * 0.60 + Math.cos(t * 4.2) * 6;

  // Heavy Quad-Track Base & Armored Hull
  c.fillStyle = isImpactFlash ? '#09090b' : '#7f1d1d';
  c.strokeStyle = isImpactFlash ? '#ffffff' : '#fca5a5';
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(bossX - 72, bossY - 76, 144, 128, 16);
  c.fill();
  c.stroke();

  // Rotary Saw Arms
  for (const dir of [-1, 1]) {
    const sawX = bossX + dir * 92;
    const sawY = bossY - 18 + Math.sin(t * 5 + dir) * 10;
    c.strokeStyle = isImpactFlash ? '#ffffff' : pal.danger;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(sawX, sawY, 28, 0, Math.PI * 2);
    c.stroke();
  }

  // Hector Iron-Crown Lock Shatter & Rescued Core Reveal
  if (state.scrap.hectorLockShatter) {
    // Exposed glowing rescue core
    c.fillStyle = '#4ade80';
    c.beginPath();
    c.arc(bossX, bossY - 14, 22 + Math.sin(t * 9) * 3, 0, Math.PI * 2);
    c.fill();

    // Shattered Iron-Crown lock fragments flying outward
    const spread = 24 + ((t * 28) % 36);
    c.fillStyle = pal.gold;
    for (let f = 0; f < 6; f++) {
      const ang = (f * Math.PI) / 3 + t * 1.8;
      const fx = bossX + Math.cos(ang) * spread;
      const fy = bossY - 14 + Math.sin(ang) * spread;
      c.beginPath();
      c.arc(fx, fy, 6, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    c.fillStyle = pal.gold;
    c.beginPath();
    c.roundRect(bossX - 24, bossY - 38, 48, 48, 8);
    c.fill();
  }

  // Anime Diagonal Cut-in Banner
  if (state.scrap.animeCutInImpact) {
    c.save();
    c.fillStyle = 'rgba(177, 31, 75, 0.92)';
    c.strokeStyle = '#fde047';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, h * 0.18);
    c.lineTo(w, h * 0.08);
    c.lineTo(w, h * 0.30);
    c.lineTo(0, h * 0.40);
    c.closePath();
    c.fill();
    c.stroke();

    c.fillStyle = '#ffffff';
    c.font = 'bold 24px "Segoe UI", sans-serif';
    c.fillText('ANIME CUT-IN // 炉心觉醒 · 锻火破甲冲击帧 (IMPACT FRAME ACTIVE)', 42, h * 0.27);
    c.restore();
  }

  // Labels
  c.fillStyle = isImpactFlash ? '#ffffff' : pal.text;
  c.font = 'bold 13px Consolas, monospace';
  c.fillText('R-17「锻火拳」(Greenbrook Maintainer)', r17X - 110, r17Y + 86);
  c.fillText('BOSS「铁冠·赫克托」(Iron-Crown Hector)', bossX - 115, bossY + 86);
}

function renderEchoStage(c: CanvasRenderingContext2D, w: number, h: number) {
  const pal = getThemePalette();
  const t = state.simTimeSec;

  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, pal.bgTop);
  grad.addColorStop(1, pal.bgBottom);
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);

  // Left: Echo Workshop Dual-Reel Magnetic Cassette Deck
  const deckX = 64;
  const deckY = 92;
  const deckW = 420;
  const deckH = 250;

  c.fillStyle = pal.panelBg;
  c.strokeStyle = pal.panelBorder;
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(deckX, deckY, deckW, deckH, 16);
  c.fill();
  c.stroke();

  c.fillStyle = pal.accent;
  c.font = 'bold 13px Consolas, monospace';
  c.fillText('ECHO WORKSHOP // 回声车间双转轮声档母带机', deckX + 20, deckY + 30);

  for (const reelOffset of [125, 295]) {
    const rx = deckX + reelOffset;
    const ry = deckY + 132;
    c.strokeStyle = pal.accent;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(rx, ry, 52, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = pal.text;
    c.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = t * 2.8 + (k * Math.PI * 2) / 3;
      c.beginPath();
      c.moveTo(rx + Math.cos(a) * 12, ry + Math.sin(a) * 12);
      c.lineTo(rx + Math.cos(a) * 44, ry + Math.sin(a) * 44);
      c.stroke();
    }
  }

  // Right: Real-time 36-Band Web Audio Procedural Spectrum
  const specX = 520;
  const specY = 92;
  const specW = w - specX - 48;
  const specH = 250;

  c.fillStyle = pal.panelBg;
  c.strokeStyle = pal.panelBorder;
  c.beginPath();
  c.roundRect(specX, specY, specW, specH, 16);
  c.fill();
  c.stroke();

  c.fillStyle = pal.accentSecondary;
  c.font = 'bold 13px Consolas, monospace';
  c.fillText(
    `WEB AUDIO PROCEDURAL SYNTH // ${state.echo.tunnelReverb ? 'TUNNEL DELAY REVERB (ON)' : 'DIRECT DRY SIGNAL'}`,
    specX + 20,
    specY + 30
  );

  const bands = 32;
  const barW = (specW - 48) / bands;
  for (let i = 0; i < bands; i++) {
    const freqPhase = t * 6 + i * 0.42;
    const amp =
      0.35 +
      0.45 * Math.abs(Math.sin(freqPhase)) +
      (state.echo.tunnelReverb ? 0.18 * Math.cos(t * 3 - i * 0.3) : 0);
    const bh = Math.max(12, Math.min(specH - 72, amp * (specH - 72)));
    const bx = specX + 24 + i * barW;
    const by = specY + specH - 22 - bh;
    c.fillStyle = i % 3 === 0 ? pal.accent : pal.accentSecondary;
    c.fillRect(bx, by, barW - 4, bh);
  }

  // Bottom: Multi-branch Narrative State Machine Timeline
  const nodes = STORY_NODES[state.echoPreset];
  const activeIdx = state.echo.storyNodeIndex % nodes.length;
  const timelineY = 408;
  const startX = 86;
  const endX = w - 86;
  const stepX = nodes.length > 1 ? (endX - startX) / (nodes.length - 1) : 0;

  c.strokeStyle = pal.panelBorder;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(startX, timelineY);
  c.lineTo(endX, timelineY);
  c.stroke();

  nodes.forEach((node, idx) => {
    const nx = startX + idx * stepX;
    const isCurrent = idx === activeIdx;
    c.fillStyle = isCurrent ? pal.accent : pal.panelBg;
    c.strokeStyle = isCurrent ? pal.accent : pal.text;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(nx, timelineY, isCurrent ? 14 : 9, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    c.fillStyle = isCurrent ? pal.accent : pal.text;
    c.font = isCurrent ? 'bold 12px Consolas, monospace' : '11px Consolas, monospace';
    c.fillText(node.code, nx - 44, timelineY - 24);
    c.fillStyle = pal.muted;
    c.font = '12px "Segoe UI", sans-serif';
    c.fillText(node.title.slice(0, 14), nx - 48, timelineY + 34);
  });
}

function updateHudDom() {
  const summary = computeHudSummary(state);
  if (hudLeft) {
    hudLeft.innerHTML = `<strong>${summary.leftTitle}</strong><br><span>${summary.leftSummary}</span>`;
  }
  if (hudRight) {
    hudRight.textContent = summary.rightTelemetry;
  }
}

export function renderStageFrame() {
  if (!canvas || !ctx) return;
  stepStageState(state, 1 / 60);
  if (state.activeTab === 'wanan') {
    renderWananStage(ctx, canvas.width, canvas.height);
  } else if (state.activeTab === 'scrap') {
    renderScrapStage(ctx, canvas.width, canvas.height);
  } else {
    renderEchoStage(ctx, canvas.width, canvas.height);
  }
  updateHudDom();
}

function syncControlsDom() {
  document.querySelectorAll<HTMLButtonElement>('[data-stage-tab]').forEach((btn) => {
    const active = btn.dataset.stageTab === state.activeTab;
    btn.setAttribute('aria-selected', String(active));
    btn.setAttribute('aria-pressed', String(active));
  });

  document.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== state.activeTab;
  });

  document.querySelectorAll<HTMLButtonElement>('[data-car-id]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.carId === state.selectedCar));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-wanan-toggle]').forEach((btn) => {
    const key = btn.dataset.wananToggle as keyof StageState['wanan'];
    btn.setAttribute('aria-pressed', String(Boolean(state.wanan[key])));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-scrap-toggle]').forEach((btn) => {
    const key = btn.dataset.scrapToggle as keyof StageState['scrap'];
    btn.setAttribute('aria-pressed', String(Boolean(state.scrap[key])));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-echo-preset]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.echoPreset === state.echoPreset));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-echo-toggle]').forEach((btn) => {
    const key = btn.dataset.echoToggle;
    if (key === 'webAudioSynth' || key === 'tunnelReverb') {
      btn.setAttribute('aria-pressed', String(Boolean(state.echo[key])));
    }
  });
}

function bindEvents() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  themeBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    renderStageFrame();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-stage-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.stageTab as StageTabId;
      if (tab) {
        state.activeTab = tab;
        syncControlsDom();
        renderStageFrame();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-car-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const car = btn.dataset.carId as WananCarId;
      if (car) {
        state.selectedCar = car;
        syncControlsDom();
        renderStageFrame();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-wanan-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.wananToggle as keyof StageState['wanan'];
      if (key in state.wanan) {
        state.wanan[key] = !state.wanan[key];
        syncControlsDom();
        renderStageFrame();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-scrap-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.scrapToggle as keyof StageState['scrap'];
      if (key in state.scrap) {
        state.scrap[key] = !state.scrap[key];
        syncControlsDom();
        renderStageFrame();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-echo-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.echoPreset as EchoPresetId;
      if (preset) {
        state.echoPreset = preset;
        state.echo.storyNodeIndex = 0;
        syncAudioSynth();
        syncControlsDom();
        renderStageFrame();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-echo-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.echoToggle;
      if (key === 'webAudioSynth') {
        state.echo.webAudioSynth = !state.echo.webAudioSynth;
        syncAudioSynth();
      } else if (key === 'tunnelReverb') {
        state.echo.tunnelReverb = !state.echo.tunnelReverb;
        syncAudioSynth();
      } else if (key === 'branchStep') {
        state.echo.storyNodeIndex += 1;
      }
      syncControlsDom();
      renderStageFrame();
    });
  });
}

window.__labStage = {
  getState: () => structuredClone(state),
  setTab: (tab: StageTabId) => {
    state.activeTab = tab;
    syncControlsDom();
    renderStageFrame();
  },
  setCar: (car: WananCarId) => {
    state.selectedCar = car;
    syncControlsDom();
    renderStageFrame();
  },
  toggleWanan: (key) => {
    state.wanan[key] = !state.wanan[key];
    syncControlsDom();
    renderStageFrame();
  },
  toggleScrap: (key) => {
    state.scrap[key] = !state.scrap[key];
    syncControlsDom();
    renderStageFrame();
  },
  setEchoPreset: (preset) => {
    state.echoPreset = preset;
    state.echo.storyNodeIndex = 0;
    syncControlsDom();
    renderStageFrame();
  },
  advanceStoryNode: () => {
    state.echo.storyNodeIndex += 1;
    syncControlsDom();
    renderStageFrame();
  },
  stepFrames: (count: number) => {
    for (let i = 0; i < count; i++) {
      renderStageFrame();
    }
    return structuredClone(state);
  },
};

bindEvents();
syncControlsDom();
renderStageFrame();

function animateLoop() {
  renderStageFrame();
  requestAnimationFrame(animateLoop);
}
requestAnimationFrame(animateLoop);
