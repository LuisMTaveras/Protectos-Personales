// ==========================================================================
// MÓDULO TEST DE ISHIHARA (DISCRIMINACIÓN CROMÁTICA / DALTONISMO)
// ==========================================================================

export const ISHIHARA_PLATES = [
  {
    id: 1,
    expectedNumber: '12',
    name: 'Lámina Demostrativa 1',
    description: 'Lámina de control visible para personas con visión normal o daltonismo.',
    options: ['12', '72', '21', 'Ninguno'],
    bgColors: ['#94a3b8', '#64748b', '#cbd5e1', '#e2e8f0', '#94a3b8'],
    fgColors: ['#ea580c', '#f97316', '#fb923c', '#c2410c'],
    dotsSeed: [
      // Puntos que forman el número 12
      { x: 38, y: 32, r: 5, fg: true }, { x: 38, y: 44, r: 6, fg: true }, { x: 38, y: 56, r: 5, fg: true }, { x: 38, y: 68, r: 6, fg: true }, { x: 32, y: 38, r: 4, fg: true },
      { x: 54, y: 32, r: 5, fg: true }, { x: 64, y: 34, r: 6, fg: true }, { x: 68, y: 44, r: 5, fg: true }, { x: 60, y: 54, r: 6, fg: true }, { x: 54, y: 64, r: 5, fg: true }, { x: 62, y: 68, r: 6, fg: true }, { x: 70, y: 68, r: 5, fg: true }
    ]
  },
  {
    id: 2,
    expectedNumber: '74',
    name: 'Lámina Protan/Deutan 2',
    description: 'Detección de ceguera al color rojo-verde (protanopia o deuteranopia).',
    options: ['74', '21', '71', 'Ninguno'],
    bgColors: ['#f87171', '#ef4444', '#dc2626', '#fca5a5', '#fb7185'],
    fgColors: ['#10b981', '#059669', '#34d399', '#047857'],
    dotsSeed: [
      // 7
      { x: 30, y: 32, r: 5, fg: true }, { x: 40, y: 32, r: 6, fg: true }, { x: 48, y: 34, r: 5, fg: true }, { x: 44, y: 44, r: 5, fg: true }, { x: 38, y: 56, r: 6, fg: true }, { x: 34, y: 68, r: 5, fg: true },
      // 4
      { x: 68, y: 32, r: 5, fg: true }, { x: 60, y: 44, r: 6, fg: true }, { x: 56, y: 54, r: 5, fg: true }, { x: 64, y: 54, r: 6, fg: true }, { x: 72, y: 54, r: 5, fg: true }, { x: 68, y: 44, r: 6, fg: true }, { x: 68, y: 66, r: 6, fg: true }
    ]
  },
  {
    id: 3,
    expectedNumber: '6',
    name: 'Lámina Cromática 3',
    description: 'Discriminación de contraste cromático de saturación media.',
    options: ['6', '5', '8', 'Ninguno'],
    bgColors: ['#34d399', '#10b981', '#059669', '#6ee7b7', '#14b8a6'],
    fgColors: ['#f97316', '#ea580c', '#fb923c', '#f59e0b'],
    dotsSeed: [
      { x: 56, y: 30, r: 5, fg: true }, { x: 46, y: 36, r: 6, fg: true }, { x: 40, y: 46, r: 6, fg: true }, { x: 40, y: 58, r: 6, fg: true }, { x: 48, y: 68, r: 6, fg: true }, { x: 58, y: 68, r: 5, fg: true }, { x: 62, y: 58, r: 6, fg: true }, { x: 56, y: 50, r: 5, fg: true }, { x: 46, y: 50, r: 5, fg: true }
    ]
  }
];

/**
 * Genera el SVG completo de la lámina de Ishihara con puntos de fondo aleatorios
 * y puntos objetivo que forman los dígitos.
 */
export function generateIshiharaSvg(plate) {
  const circles = [];
  const radius = 45;
  const center = 50;

  // Generar cuadrícula de puntos de fondo
  for (let x = 12; x <= 88; x += 5.5) {
    for (let y = 12; y <= 88; y += 5.5) {
      const dist = Math.hypot(x - center, y - center);
      if (dist < radius - 3) {
        // Desfase aleatorio natural
        const jx = x + (Math.random() - 0.5) * 2.2;
        const jy = y + (Math.random() - 0.5) * 2.2;
        const r = 2.2 + Math.random() * 2.5;

        // Comprobar si coincide con un punto del número
        const isNearSeed = plate.dotsSeed.some(seed => Math.hypot(seed.x - jx, seed.y - jy) < 4.8);

        if (!isNearSeed) {
          const color = plate.bgColors[Math.floor(Math.random() * plate.bgColors.length)];
          circles.push(`<circle cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="0.88"/>`);
        }
      }
    }
  }

  // Insertar puntos del número con sus colores característicos
  plate.dotsSeed.forEach(seed => {
    const color = plate.fgColors[Math.floor(Math.random() * plate.fgColors.length)];
    const r = seed.r * 0.75 + Math.random() * 0.8;
    circles.push(`<circle cx="${seed.x}" cy="${seed.y}" r="${r.toFixed(1)}" fill="${color}" opacity="0.95"/>`);
  });

  return `
    <g class="ishihara-plate-group">
      <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
      ${circles.join('')}
    </g>
  `;
}
