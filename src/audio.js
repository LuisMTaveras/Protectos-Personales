// ==========================================================================
// MÓDULO DE AUDIO: Web Audio API para Localización Estéreo y Audiometría
// ==========================================================================

let audioCtx = null;

export function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Emite un tono sinusoidal calibrado a un canal estéreo específico.
 * @param {'left'|'right'|'none'} channel Canal de emisión
 * @param {number} durationMs Duración del estímulo en milisegundos
 * @param {number} freq Frecuencia en Hz (por defecto 1000Hz estándar de audiometría)
 * @returns {Promise<void>}
 */
export function playAudiometryTone(channel, durationMs = 1200, freq = 1000) {
  return new Promise((resolve) => {
    if (channel === 'none') {
      setTimeout(resolve, durationMs);
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) {
      setTimeout(resolve, durationMs);
      return;
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const panValue = channel === 'left' ? -1 : 1;
    if (panNode) {
      panNode.pan.setValueAtTime(panValue, ctx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(ctx.destination);
    } else {
      // Fallback si no hay StereoPanner
      const merger = ctx.createChannelMerger(2);
      osc.connect(gainNode);
      gainNode.connect(merger, 0, channel === 'left' ? 0 : 1);
      merger.connect(ctx.destination);
    }

    // Envolvente de ataque y relajación suave (elimina "clicks")
    const now = ctx.currentTime;
    const durSec = durationMs / 1000;
    const attack = 0.05;
    const release = 0.08;

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.35, now + attack);
    gainNode.gain.setValueAtTime(0.35, now + durSec - release);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

    osc.start(now);
    osc.stop(now + durSec);

    osc.onended = () => {
      resolve();
    };
  });
}

/**
 * Sonido breve de feedback al usuario tras una acción
 * @param {boolean} isSuccess
 */
export function playFeedbackSound(isSuccess) {
  const ctx = getAudioContext();
  if (!ctx) return;

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
}

/**
 * Prueba rápida estéreo para verificar auriculares antes de iniciar el test
 */
export async function testStereoChannels() {
  getAudioContext();
  // Canal izquierdo
  await playAudiometryTone('left', 400, 800);
  await new Promise(r => setTimeout(r, 200));
  // Canal derecho
  await playAudiometryTone('right', 400, 1200);
}
