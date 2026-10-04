// ==========================================================================
// MÓDULO OPTOTIPO LANDOLT C (AGUDEZA VISUAL ESTANDARIZADA)
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
 * Genera el SVG del Anillo Landolt con proporciones oftalmológicas de 5:1.
 * Grosor de trazo = 1/5 del diámetro exterior; corte = 1/5.
 * @param {string} orientationId 'up' | 'down' | 'left' | 'right'
 * @param {number} sizePx Diámetro en píxeles
 * @returns {string} Código SVG interno
 */
export function renderLandoltSvg(orientationId, sizePx) {
  const orient = ORIENTATIONS.find(o => o.id === orientationId) || ORIENTATIONS[0];
  const angle = orient.angle;

  // Centro en (50, 50), radio exterior 45, radio interior 27, grosor 18
  // Corte a la derecha de 40 grados (de +24° a -24°)
  // Dibujamos un arco grueso con stroke
  // Un círculo de radio 36 con stroke de 18 (diámetro total 72 + 18 = 90)
  // Perímetro aproximado = 2 * PI * 36 = 226.19
  // La hendidura mide 18 unidades -> stroke-dasharray = (226.19 - 22) 22 = 204.19 22
  const circ = 2 * Math.PI * 36;
  const gap = 24;
  const dashLength = (circ - gap).toFixed(2);

  return `
    <g transform="rotate(${angle} 50 50)">
      <circle 
        cx="50" 
        cy="50" 
        r="36" 
        fill="none" 
        stroke="#0f172a" 
        stroke-width="18"
        stroke-dasharray="${dashLength} ${gap}"
        stroke-dashoffset="${(circ - gap) / 2}"
        stroke-linecap="butt"
      />
    </g>
  `;
}

/**
 * Selecciona una orientación aleatoria
 */
export function getRandomOrientation() {
  const idx = Math.floor(Math.random() * ORIENTATIONS.length);
  return ORIENTATIONS[idx];
}
