// ==========================================================================
// MÓDULO DE VOZ CLÍNICA: Web Speech Synthesis API
// ==========================================================================

let isSpeechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
let isMuted = false;

export function setVoiceMuted(muted) {
  isMuted = muted;
  if (isMuted && isSpeechAvailable) {
    window.speechSynthesis.cancel();
  }
}

export function isVoiceMuted() {
  return isMuted;
}

/**
 * Reproduce una instrucción clínica por voz con entonación médica pausada
 * @param {string} text Texto a pronunciar
 */
export function speakInstruction(text) {
  if (!isSpeechAvailable || isMuted) return;

  try {
    window.speechSynthesis.cancel(); // Detener cualquier locución previa

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-DO'; // Priorizar español dominicano/latino
    utterance.rate = 0.95;    // Cadencia pausada y profesional
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    // Buscar una voz en español disponible
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es')) || null;
    if (esVoice) {
      utterance.voice = esVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Falla silenciosa si el navegador bloquea la síntesis automática
  }
}
