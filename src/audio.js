// ==========================================================================
// MÓDULO DE AUDIO: Web Audio API para Localización Estéreo y Audiometría
// ==========================================================================

let audioCtx = null;
let isChannelsInverted = false;

// Inicializar preferencia de canales invertidos desde localStorage
try {
  if (typeof window !== 'undefined' && localStorage.getItem('audiometry_channels_inverted') === 'true') {
    isChannelsInverted = true;
  }
} catch {}

export function setChannelsInverted(inverted) {
  isChannelsInverted = Boolean(inverted);
  try {
    localStorage.setItem('audiometry_channels_inverted', isChannelsInverted ? 'true' : 'false');
  } catch {}
}

export function areChannelsInverted() {
  return isChannelsInverted;
}

export async function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {}
  }
  return audioCtx;
}

/**
 * Emite un tono sinusoidal calibrado a un canal estéreo específico con aislamiento 100% discreto.
 * @param {'left'|'right'|'none'} channel Canal de emisión
 * @param {number} durationMs Duración del estímulo en milisegundos
 * @param {number} freq Frecuencia en Hz (por defecto 1000Hz estándar de audiometría)
 * @returns {Promise<void>}
 */
export async function playAudiometryTone(channel, durationMs = 1200, freq = 1000) {
  if (channel === 'none') {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    return;
  }

  const ctx = await getAudioContext();
  if (!ctx) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    return;
  }

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {}
  }

  return new Promise((resolve) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Enrutamiento discreto a 2 canales mediante ChannelMergerNode:
    // Entrada 0 -> Canal 0 (Audífono Izquierdo / Left)
    // Entrada 1 -> Canal 1 (Audífono Derecho / Right)
    const merger = ctx.createChannelMerger(2);

    let isLeft = (channel === 'left');
    if (isChannelsInverted) {
      isLeft = !isLeft;
    }
    const targetChannelIndex = isLeft ? 0 : 1;

    // Conectar oscilador al nodo de ganancia
    osc.connect(gainNode);

    // Conectar ganancia ÚNICAMENTE a la entrada del canal correspondiente:
    // La otra entrada queda completamente desconectada (silencio digital 0.0)
    gainNode.connect(merger, 0, targetChannelIndex);
    merger.connect(ctx.destination);

    // Envolvente de ataque y relajación suave (elimina "clicks" acústicos)
    const now = ctx.currentTime;
    const durSec = durationMs / 1000;
    const attack = 0.04;
    const release = 0.06;

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.4, now + attack);
    gainNode.gain.setValueAtTime(0.4, now + durSec - release);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

    osc.start(now);
    osc.stop(now + durSec);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
        merger.disconnect();
      } catch {}
      resolve();
    };
  });
}

/**
 * Sonido breve de feedback al usuario tras una acción
 * @param {boolean} isSuccess
 */
export function playFeedbackSound(isSuccess) {
  if (!audioCtx) return;
  const ctx = audioCtx;
  if (ctx.state === 'suspended') return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      // Sonido dulce ascendente
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Sonido sutil de error (grave)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch {}
}

/**
 * Prueba rápida estéreo para verificar auriculares antes de iniciar el test
 * @param {Function} [onStepChange] Callback para informar a la interfaz qué oído está sonando
 */
export async function testStereoChannels(onStepChange) {
  const ctx = await getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {}
  }

  // Canal izquierdo (tono medio-grave 800Hz)
  if (onStepChange) onStepChange('left');
  await playAudiometryTone('left', 650, 800);

  await new Promise(r => setTimeout(r, 450));

  // Canal derecho (tono medio-agudo 1200Hz)
  if (onStepChange) onStepChange('right');
  await playAudiometryTone('right', 650, 1200);

  await new Promise(r => setTimeout(r, 350));
  if (onStepChange) onStepChange('done');
}

