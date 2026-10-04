// ==========================================================================
// MÓDULO TEST DE ISHIHARA (DISCRIMINACIÓN CROMÁTICA / DALTONISMO)
// Estandarizado para diagnóstico oftalmológico de aptitud para conducción
// ==========================================================================

export const ISHIHARA_PLATES = [
  {
    id: 1,
    expectedNumber: '12',
    name: 'Lámina 1: Demostración Clínica',
    description: 'Lámina de control visible con agudeza cromática normal o discromatopsia.',
    options: ['12', '72', '21', 'Ninguno'],
    bgColors: ['#94a3b8', '#64748b', '#cbd5e1', '#78716c', '#a8a29e'],
    fgColors: ['#ea580c', '#f97316', '#fb923c', '#c2410c', '#dc2626'],
    dotsSeed: [
      // Dígito 1
      { x: 34, y: 34, r: 4.8 }, { x: 38, y: 30, r: 5.2 }, { x: 38, y: 38, r: 5.0 },
      { x: 38, y: 46, r: 5.2 }, { x: 38, y: 54, r: 5.0 }, { x: 38, y: 62, r: 5.2 },
      { x: 34, y: 68, r: 4.8 }, { x: 38, y: 68, r: 5.2 }, { x: 42, y: 68, r: 4.8 },
      // Dígito 2
      { x: 52, y: 34, r: 4.8 }, { x: 58, y: 30, r: 5.2 }, { x: 64, y: 32, r: 5.0 },
      { x: 67, y: 38, r: 5.0 }, { x: 65, y: 46, r: 4.8 }, { x: 59, y: 52, r: 5.0 },
      { x: 54, y: 58, r: 5.0 }, { x: 52, y: 64, r: 4.8 }, { x: 56, y: 68, r: 5.0 },
      { x: 62, y: 68, r: 5.2 }, { x: 68, y: 68, r: 5.2 }
    ]
  },
  {
    id: 2,
    expectedNumber: '74',
    name: 'Lámina 2: Protan / Deutan',
    description: 'Detección de ceguera al color rojo-verde (protanopía o deuteranopía).',
    options: ['74', '21', '71', 'Ninguno'],
    bgColors: ['#f87171', '#ef4444', '#dc2626', '#fca5a5', '#fb7185', '#e11d48'],
    fgColors: ['#10b981', '#059669', '#34d399', '#047857', '#059669', '#14b8a6'],
    dotsSeed: [
      // Dígito 7
      { x: 30, y: 30, r: 5.0 }, { x: 38, y: 30, r: 5.2 }, { x: 46, y: 32, r: 5.0 },
      { x: 44, y: 40, r: 4.8 }, { x: 40, y: 48, r: 5.0 }, { x: 36, y: 56, r: 5.0 },
      { x: 32, y: 66, r: 5.2 },
      // Dígito 4
      { x: 64, y: 30, r: 5.0 }, { x: 58, y: 40, r: 5.0 }, { x: 54, y: 50, r: 5.0 },
      { x: 60, y: 52, r: 5.2 }, { x: 66, y: 52, r: 5.2 }, { x: 72, y: 52, r: 5.0 },
      { x: 66, y: 42, r: 5.0 }, { x: 66, y: 60, r: 5.2 }, { x: 66, y: 68, r: 5.0 }
    ]
  },
  {
    id: 3,
    expectedNumber: '6',
    name: 'Lámina 3: Sensibilidad Foveal',
    description: 'Discriminación de contraste cromático de saturación media.',
    options: ['6', '5', '8', 'Ninguno'],
    bgColors: ['#34d399', '#10b981', '#059669', '#6ee7b7', '#14b8a6', '#2dd4bf'],
    fgColors: ['#f97316', '#ea580c', '#fb923c', '#f59e0b', '#d97706'],
    dotsSeed: [
      { x: 56, y: 28, r: 5.0 }, { x: 48, y: 32, r: 5.2 }, { x: 42, y: 40, r: 5.0 },
      { x: 40, y: 48, r: 5.2 }, { x: 40, y: 58, r: 5.2 }, { x: 44, y: 66, r: 5.0 },
      { x: 52, y: 68, r: 5.2 }, { x: 60, y: 66, r: 5.0 }, { x: 64, y: 58, r: 5.2 },
      { x: 60, y: 50, r: 5.0 }, { x: 52, y: 48, r: 5.0 }, { x: 44, y: 52, r: 4.8 }
    ]
  },
  {
    id: 4,
    expectedNumber: '8',
    name: 'Lámina 4: Red-Green Confusión',
    description: 'Discriminación específica para conductores ante semáforos nocturnos.',
    options: ['8', '3', '0', 'Ninguno'],
    bgColors: ['#fb923c', '#f97316', '#fdba74', '#ea580c', '#fed7aa'],
    fgColors: ['#059669', '#10b981', '#047857', '#065f46', '#34d399'],
    dotsSeed: [
      // Bucle superior
      { x: 50, y: 28, r: 5.0 }, { x: 44, y: 32, r: 4.8 }, { x: 56, y: 32, r: 4.8 },
      { x: 42, y: 40, r: 5.0 }, { x: 58, y: 40, r: 5.0 }, { x: 50, y: 46, r: 5.2 },
      // Bucle inferior
      { x: 42, y: 54, r: 5.2 }, { x: 58, y: 54, r: 5.2 }, { x: 40, y: 62, r: 5.0 },
      { x: 60, y: 62, r: 5.0 }, { x: 44, y: 68, r: 5.0 }, { x: 56, y: 68, r: 5.0 },
      { x: 50, y: 70, r: 5.2 }
    ]
  }
];

/**
 * Devuelve las 4 opciones de respuesta barajadas aleatoriamente (Fisher-Yates),
 * de modo que la respuesta correcta nunca quede fija en el mismo botón.
 */
export function getShuffledOptions(plate) {
  if (!plate || !plate.options) return [];
  const opts = [...plate.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

/**
 * Genera el SVG auténtico de alta fidelidad de la lámina de Ishihara con fondo clínico,
 * puntos pseudoisocromáticos densos, distribución oftalmológica natural y variación de posición.
 */
export function generateIshiharaSvg(plate) {
  const circles = [];
  const radius = 46;
  const center = 50;

  // Variación sutil de traslación (-1.6 a +1.6) para que el número no quede en una posición 100% fija
  const shiftX = (Math.random() - 0.5) * 3.2;
  const shiftY = (Math.random() - 0.5) * 3.2;

  const shiftedSeeds = plate.dotsSeed.map(s => ({
    x: s.x + shiftX,
    y: s.y + shiftY,
    r: s.r
  }));

  // Generar cuadrícula densa de puntos de fondo con variación orgánica
  for (let x = 8; x <= 92; x += 4.8) {
    for (let y = 8; y <= 92; y += 4.8) {
      const dist = Math.hypot(x - center, y - center);
      if (dist < radius - 2) {
        // Desfase aleatorio para romper la cuadrícula
        const jx = x + (Math.random() - 0.5) * 2.4;
        const jy = y + (Math.random() - 0.5) * 2.4;
        const r = 1.9 + Math.random() * 2.3;

        // Comprobar cercanía a los puntos del número
        const isNearSeed = shiftedSeeds.some(seed => Math.hypot(seed.x - jx, seed.y - jy) < 4.2);

        if (!isNearSeed) {
          const color = plate.bgColors[Math.floor(Math.random() * plate.bgColors.length)];
          circles.push(`<circle cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="0.94"/>`);
        }
      }
    }
  }

  // Insertar puntos del número con pigmentación característica
  shiftedSeeds.forEach(seed => {
    const color = plate.fgColors[Math.floor(Math.random() * plate.fgColors.length)];
    const r = seed.r * 0.82 + Math.random() * 0.7;
    // Puntos adicionales para un contorno natural y suave
    circles.push(`<circle cx="${seed.x.toFixed(1)}" cy="${seed.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="0.98"/>`);
    const offsetX = (Math.random() - 0.5) * 1.5;
    const offsetY = (Math.random() - 0.5) * 1.5;
    circles.push(`<circle cx="${(seed.x + offsetX).toFixed(1)}" cy="${(seed.y + offsetY).toFixed(1)}" r="${(r * 0.65).toFixed(1)}" fill="${color}" opacity="0.92"/>`);
  });

  return `
    <g class="ishihara-plate-group">
      <defs>
        <radialGradient id="plateShade" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="85%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48.5" fill="url(#plateShade)" stroke="#cbd5e1" stroke-width="1"/>
      ${circles.join('')}
    </g>
  `;
}
