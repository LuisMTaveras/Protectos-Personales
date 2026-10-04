// ==========================================================================
// MÓDULO OPTOTIPO LANDOLT C (AGUDEZA VISUAL ESTANDARIZADA)
// Espacio interior más cerrado y abertura estrecha de alta discriminación
// ==========================================================================

export const VISION_ROUNDS = [
  { round: 1, sizePx: 140, snellen: '20/100', difficulty: 'Baja' },
  { round: 2, sizePx: 95,  snellen: '20/70',  difficulty: 'Media-Baja' },
  { round: 3, sizePx: 64,  snellen: '20/50',  difficulty: 'Media' },
  { round: 4, sizePx: 40,  snellen: '20/30',  difficulty: 'Media-Alta' },
  { round: 5, sizePx: 22,  snellen: '20/20',  difficulty: 'Alta (20/20 Estándar)' }
];

export const ORIENTATIONS = [
  { id: 'up',    angle: 270, label: 'Arriba',    key: 'ArrowUp' },
  { id: 'down',  angle: 90,  label: 'Abajo',     key: 'ArrowDown' },
  { id: 'left',  angle: 180, label: 'Izquierda', key: 'ArrowLeft' },
  { id: 'right', angle: 0,   label: 'Derecha',   key: 'ArrowRight' }
];

/**
 * Genera el SVG del Anillo C con espacio interior más cerrado y hendidura sutil.
 * @param {string} orientationId 'up' | 'down' | 'left' | 'right'
 * @param {number} sizePx Diámetro en píxeles
 * @returns {string} Código SVG interno
 */
export function renderLandoltSvg(orientationId, sizePx) {
  const orient = ORIENTATIONS.find(o => o.id === orientationId) || ORIENTATIONS[0];
  const angle = orient.angle;

  // Centro en (50, 50), radio central 32, grosor de trazo 24
  // Radio interior = 32 - 12 = 20 (orificio interior cerrado)
  // Perímetro = 2 * PI * 32 = 201.06
  // Hendidura estrecha ("más cerradita") de 14 unidades
  const circ = 2 * Math.PI * 32;
  const gap = 14;
  const dashLength = (circ - gap).toFixed(2);

  return `
    <g transform="rotate(${angle} 50 50)">
      <circle 
        cx="50" 
        cy="50" 
        r="32" 
        fill="none" 
        stroke="#0f172a" 
        stroke-width="24"
        stroke-dasharray="${dashLength} ${gap}"
        stroke-dashoffset="${(circ - gap) / 2}"
        stroke-linecap="butt"
      />
    </g>
  `;
}

export function getRandomOrientation() {
  const idx = Math.floor(Math.random() * ORIENTATIONS.length);
  return ORIENTATIONS[idx];
}
