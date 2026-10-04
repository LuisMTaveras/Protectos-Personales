<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getAudioContext, playAudiometryTone, playFeedbackSound, testStereoChannels } from './audio.js';
import { VISION_ROUNDS, ORIENTATIONS, renderLandoltSvg } from './landolt.js';
import { REACTION_COLORS } from './colorReaction.js';

// --- ESTADOS DE LA APLICACIÓN ---
const currentStage = ref('intro'); // 'intro' | 'vision' | 'audio' | 'reaction' | 'results'

// Toast flotante
const toastText = ref('');
const toastType = ref('info');
const toastVisible = ref(false);
let toastTimer = null;

function showToast(message, type = 'info') {
  toastText.value = message;
  toastType.value = type;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 2300);
}

// ==========================================================================
// 1. PRUEBA DE VISIÓN MONOCULAR BILATERAL (OJO DERECHO + OJO IZQUIERDO)
// Letra C cerrada con hendidura fina y límite de 2.5s por intento
// ==========================================================================
const currentEye = ref('OD'); // 'OD' (Ojo Derecho) | 'OI' (Ojo Izquierdo)
const eyePhase = ref('test'); // 'test' | 'transition'
const visionRound = ref(0);
const visionTotalRounds = 5;
const visionSequence = ref([]);
const currentVisionOrientation = ref(ORIENTATIONS[0]);
const visionResultsOD = ref([]);
const visionResultsOI = ref([]);
const visionTimeRemaining = ref('2.5s');
const visionIsUrgent = ref(false);
const isVisionWaiting = ref(false);

let visionTimeoutId = null;
let visionCountdownInterval = null;
let visionStartTime = 0;

const currentRoundData = computed(() => {
  return VISION_ROUNDS[visionRound.value] || VISION_ROUNDS[0];
});

const currentLandoltSvg = computed(() => {
  if (!currentVisionOrientation.value || !currentRoundData.value) return '';
  return renderLandoltSvg(currentVisionOrientation.value.id, currentRoundData.value.sizePx);
});

function clearVisionTimers() {
  if (visionTimeoutId) {
    clearTimeout(visionTimeoutId);
    visionTimeoutId = null;
  }
  if (visionCountdownInterval) {
    clearInterval(visionCountdownInterval);
    visionCountdownInterval = null;
  }
}

function startVisionTest() {
  currentStage.value = 'vision';
  currentEye.value = 'OD';
  eyePhase.value = 'test';
  visionRound.value = 0;
  visionResultsOD.value = [];
  visionResultsOI.value = [];
  isVisionWaiting.value = false;

  prepareEyeSequence();
  nextVisionRound();
}

function prepareEyeSequence() {
  const allFour = [...ORIENTATIONS].sort(() => Math.random() - 0.5);
  const extraOne = ORIENTATIONS[Math.floor(Math.random() * ORIENTATIONS.length)];
  visionSequence.value = [...allFour, extraOne].sort(() => Math.random() - 0.5);
}

function nextVisionRound() {
  if (visionRound.value >= visionTotalRounds) {
    // Si terminó el ojo derecho, pasar a transición de cambio de ojo
    if (currentEye.value === 'OD') {
      clearVisionTimers();
      isVisionWaiting.value = false;
      eyePhase.value = 'transition';
      showToast('Ojo Derecho completado. Cambie de ojo.', 'info');
      return;
    } else {
      // Si terminó el ojo izquierdo, finalizar examen de visión
      finishVisionTest();
      return;
    }
  }

  clearVisionTimers();
  currentVisionOrientation.value = visionSequence.value[visionRound.value];
  visionTimeRemaining.value = '2.5s';
  visionIsUrgent.value = false;
  isVisionWaiting.value = true;

  visionStartTime = performance.now();
  startVisionCountdown(2500);

  visionTimeoutId = setTimeout(() => {
    if (isVisionWaiting.value) {
      handleVisionTimeout();
    }
  }, 2500);
}

function continueWithLeftEye() {
  currentEye.value = 'OI';
  eyePhase.value = 'test';
  visionRound.value = 0;
  prepareEyeSequence();
  nextVisionRound();
}

function startVisionCountdown(totalMs) {
  const start = performance.now();
  visionCountdownInterval = setInterval(() => {
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, totalMs - elapsed);
    visionTimeRemaining.value = `${(remaining / 1000).toFixed(1)}s`;
    visionIsUrgent.value = remaining <= 800;

    if (remaining <= 0) {
      clearInterval(visionCountdownInterval);
      visionCountdownInterval = null;
    }
  }, 50);
}

function handleVisionAnswer(selectedDir) {
  if (!isVisionWaiting.value || currentStage.value !== 'vision') return;

  isVisionWaiting.value = false;
  clearVisionTimers();

  const isCorrect = (selectedDir === currentVisionOrientation.value.id);
  const responseMs = Math.round(performance.now() - visionStartTime);
  playFeedbackSound(isCorrect);

  const resultEntry = {
    eye: currentEye.value === 'OD' ? 'Ojo Derecho (OD)' : 'Ojo Izquierdo (OI)',
    eyeCode: currentEye.value,
    round: visionRound.value + 1,
    expected: currentVisionOrientation.value.label,
    expectedId: currentVisionOrientation.value.id,
    given: ORIENTATIONS.find(o => o.id === selectedDir)?.label || selectedDir,
    isCorrect,
    snellen: currentRoundData.value.snellen,
    sizePx: currentRoundData.value.sizePx,
    timeMs: responseMs
  };

  if (currentEye.value === 'OD') {
    visionResultsOD.value.push(resultEntry);
  } else {
    visionResultsOI.value.push(resultEntry);
  }

  visionRound.value++;
  setTimeout(() => nextVisionRound(), 260);
}

function handleVisionTimeout() {
  isVisionWaiting.value = false;
  clearVisionTimers();
  playFeedbackSound(false);

  const resultEntry = {
    eye: currentEye.value === 'OD' ? 'Ojo Derecho (OD)' : 'Ojo Izquierdo (OI)',
    eyeCode: currentEye.value,
    round: visionRound.value + 1,
    expected: currentVisionOrientation.value.label,
    expectedId: currentVisionOrientation.value.id,
    given: 'Tiempo Agotado (>2.5s)',
    isCorrect: false,
    snellen: currentRoundData.value.snellen,
    sizePx: currentRoundData.value.sizePx,
    timeMs: 2500
  };

  if (currentEye.value === 'OD') {
    visionResultsOD.value.push(resultEntry);
  } else {
    visionResultsOI.value.push(resultEntry);
  }

  showToast('¡Tiempo agotado (2.5s)! Se registró como fallo.', 'error');
  visionRound.value++;
  setTimeout(() => nextVisionRound(), 400);
}

function finishVisionTest() {
  clearVisionTimers();
  showToast('Evaluación de ambos ojos finalizada. Pasando a Audiometría...', 'success');
  setTimeout(() => {
    startAudioTest();
  }, 850);
}

// ==========================================================================
// 2. PRUEBA DE AUDIOMETRÍA A CIEGAS (LÍMITE DE 2.0s)
// ==========================================================================
const audioRound = ref(0);
const audioTotalRounds = 5;
const audioSequence = ref([]);
const audioResults = ref([]);
const audioTimeRemaining = ref('2.0s');
const audioIsUrgent = ref(false);
const audioStateLabel = ref('Preparando emisión...');
const isAudioWaiting = ref(false);

let audioTimeoutId = null;
let audioCountdownInterval = null;
let audioStartTime = 0;

function clearAudioTimers() {
  if (audioTimeoutId) {
    clearTimeout(audioTimeoutId);
    audioTimeoutId = null;
  }
  if (audioCountdownInterval) {
    clearInterval(audioCountdownInterval);
    audioCountdownInterval = null;
  }
}

function startAudioTest() {
  currentStage.value = 'audio';
  audioRound.value = 0;
  audioResults.value = [];
  isAudioWaiting.value = false;

  const pool = ['left', 'right', 'none', 'left', 'right'];
  audioSequence.value = pool.sort(() => Math.random() - 0.5);

  nextAudioRound();
}

async function nextAudioRound() {
  if (audioRound.value >= audioTotalRounds) {
    finishAudioTest();
    return;
  }

  clearAudioTimers();
  isAudioWaiting.value = false;

  audioTimeRemaining.value = '2.0s';
  audioIsUrgent.value = false;
  audioStateLabel.value = 'Preparando emisión...';

  const target = audioSequence.value[audioRound.value];

  await new Promise(r => setTimeout(r, 600));

  audioStateLabel.value = '¡Escuche sus audífonos!';
  const freq = target === 'none' ? 0 : (850 + Math.floor(Math.random() * 5) * 200);

  playAudiometryTone(target, 750, freq);

  isAudioWaiting.value = true;
  audioStartTime = performance.now();
  startAudioCountdown(2000);

  audioTimeoutId = setTimeout(() => {
    if (isAudioWaiting.value) {
      handleAudioTimeout();
    }
  }, 2000);
}

function startAudioCountdown(totalMs) {
  const start = performance.now();
  audioCountdownInterval = setInterval(() => {
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, totalMs - elapsed);
    audioTimeRemaining.value = `${(remaining / 1000).toFixed(1)}s`;
    audioIsUrgent.value = remaining <= 700;

    if (remaining <= 0) {
      clearInterval(audioCountdownInterval);
      audioCountdownInterval = null;
    }
  }, 50);
}

function handleAudioAnswer(chosenAnswer) {
  if (!isAudioWaiting.value || currentStage.value !== 'audio') return;

  isAudioWaiting.value = false;
  clearAudioTimers();

  const target = audioSequence.value[audioRound.value];
  const isCorrect = (chosenAnswer === target);
  const timeMs = Math.round(performance.now() - audioStartTime);
  playFeedbackSound(isCorrect);

  const labelMap = {
    'left': 'Oído Izquierdo',
    'right': 'Oído Derecho',
    'none': 'Silencio (Ninguno)'
  };

  audioResults.value.push({
    round: audioRound.value + 1,
    targetChannel: target,
    targetLabel: labelMap[target],
    givenChannel: chosenAnswer,
    givenLabel: labelMap[chosenAnswer],
    isCorrect,
    timeMs
  });

  audioRound.value++;
  setTimeout(() => nextAudioRound(), 350);
}

function handleAudioTimeout() {
  isAudioWaiting.value = false;
  clearAudioTimers();
  playFeedbackSound(false);

  const target = audioSequence.value[audioRound.value];
  const labelMap = {
    'left': 'Oído Izquierdo',
    'right': 'Oído Derecho',
    'none': 'Silencio (Ninguno)'
  };

  audioResults.value.push({
    round: audioRound.value + 1,
    targetChannel: target,
    targetLabel: labelMap[target],
    givenChannel: 'timeout',
    givenLabel: 'Tiempo Agotado (>2.0s)',
    isCorrect: false,
    timeMs: 2000
  });

  showToast('¡Tiempo agotado (2s)! Se contabilizó como fallo.', 'error');
  audioRound.value++;
  setTimeout(() => nextAudioRound(), 450);
}

function finishAudioTest() {
  clearAudioTimers();
  showToast('Audiometría finalizada. Pasando a Reflejos (2s por color)...', 'success');
  setTimeout(() => {
    startReactionTest();
  }, 850);
}

// ==========================================================================
// 3. PRUEBA DE REFLEJOS & SEMÁFORO (LÍMITE 2.0s)
// ==========================================================================
const reactionTargetCount = 5;
const reactionSuccessCount = ref(0);
const reactionFalseAlarms = ref(0);
const lastReactionMs = ref('--');
const reactionTimes = ref([]);
const reactionHistory = ref([]);
const currentColor = ref(null);
const reactionTimeRemaining = ref('2.0s');
const reactionIsUrgent = ref(false);

let reactionTimerId = null;
let reactionCountdownInterval = null;
let stimulusStartTime = 0;
let isReactionRunning = false;

const currentAvgMs = computed(() => {
  if (reactionTimes.value.length === 0) return '--';
  const sum = reactionTimes.value.reduce((a, b) => a + b, 0);
  return Math.round(sum / reactionTimes.value.length);
});

function clearReactionTimers() {
  if (reactionTimerId) {
    clearTimeout(reactionTimerId);
    reactionTimerId = null;
  }
  if (reactionCountdownInterval) {
    clearInterval(reactionCountdownInterval);
    reactionCountdownInterval = null;
  }
}

function startReactionTest() {
  currentStage.value = 'reaction';
  isReactionRunning = true;
  reactionSuccessCount.value = 0;
  reactionFalseAlarms.value = 0;
  lastReactionMs.value = '--';
  reactionTimes.value = [];
  reactionHistory.value = [];
  currentColor.value = null;
  reactionTimeRemaining.value = '2.0s';
  reactionIsUrgent.value = false;

  scheduleNextStimulus();
}

function scheduleNextStimulus() {
  if (!isReactionRunning) return;

  clearReactionTimers();
  currentColor.value = null;
  reactionTimeRemaining.value = '2.0s';
  reactionIsUrgent.value = false;

  const pauseMs = 800 + Math.random() * 1000;
  reactionTimerId = setTimeout(() => {
    if (!isReactionRunning) return;
    presentStimulus();
  }, pauseMs);
}

function presentStimulus() {
  const isTarget = Math.random() > 0.45;
  if (isTarget) {
    currentColor.value = REACTION_COLORS.find(c => c.isTarget);
  } else {
    const distractors = REACTION_COLORS.filter(c => !c.isTarget);
    currentColor.value = distractors[Math.floor(Math.random() * distractors.length)];
  }

  stimulusStartTime = performance.now();
  startReactionCountdown(2000);

  if (currentColor.value.isTarget) {
    reactionTimerId = setTimeout(() => {
      if (!isReactionRunning) return;
      if (currentColor.value && currentColor.value.isTarget) {
        reactionHistory.value.push({
          color: 'Verde (Tiempo Agotado)',
          reactionMs: 2000,
          outcome: 'Tiempo Agotado (>2.0s) - No respondió'
        });
        playFeedbackSound(false);
        showToast('¡Tiempo agotado (2.0s)! No tocó a tiempo en Verde.', 'error');
        scheduleNextStimulus();
      }
    }, 2000);
  } else {
    reactionTimerId = setTimeout(() => {
      if (!isReactionRunning) return;
      scheduleNextStimulus();
    }, 1800);
  }
}

function startReactionCountdown(totalMs) {
  const start = performance.now();
  reactionCountdownInterval = setInterval(() => {
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, totalMs - elapsed);
    reactionTimeRemaining.value = `${(remaining / 1000).toFixed(1)}s`;
    reactionIsUrgent.value = remaining <= 700;

    if (remaining <= 0) {
      clearInterval(reactionCountdownInterval);
      reactionCountdownInterval = null;
    }
  }, 50);
}

function handleReactionTrigger() {
  if (!isReactionRunning || currentStage.value !== 'reaction') return;

  const now = performance.now();
  clearReactionTimers();

  if (!currentColor.value) {
    reactionFalseAlarms.value++;
    playFeedbackSound(false);
    reactionHistory.value.push({
      color: 'Luz apagada',
      reactionMs: 0,
      outcome: 'Falsa Alarma (Anticipación)'
    });
    showToast('¡Falsa Alarma! Tocó antes de encender la luz.', 'error');
    scheduleNextStimulus();
    return;
  }

  if (!currentColor.value.isTarget) {
    reactionFalseAlarms.value++;
    playFeedbackSound(false);
    const wrongColor = currentColor.value.name;
    const elapsed = Math.round(now - stimulusStartTime);
    reactionHistory.value.push({
      color: wrongColor,
      reactionMs: elapsed,
      outcome: `Falsa Alarma (Pulsado en ${wrongColor})`
    });
    showToast(`¡Falsa Alarma! Tocó en color ${wrongColor}.`, 'error');
    scheduleNextStimulus();
    return;
  }

  const reactionMs = Math.round(now - stimulusStartTime);
  reactionTimes.value.push(reactionMs);
  reactionSuccessCount.value++;
  lastReactionMs.value = `${reactionMs}`;
  playFeedbackSound(true);

  reactionHistory.value.push({
    color: 'Verde',
    reactionMs,
    outcome: 'Acierto Objetivo'
  });

  showToast(`¡Acierto verde en ${reactionMs} ms!`, 'success');

  if (reactionSuccessCount.value >= reactionTargetCount) {
    finishReactionTest();
  } else {
    scheduleNextStimulus();
  }
}

function finishReactionTest() {
  isReactionRunning = false;
  clearReactionTimers();
  currentStage.value = 'results';
}

// ==========================================================================
// 4. DICTAMEN MÉDICO FINAL (EVALUACIÓN MONOCULAR OD + OI)
// ==========================================================================
const visionHitsOD = computed(() => visionResultsOD.value.filter(r => r.isCorrect).length);
const visionHitsOI = computed(() => visionResultsOI.value.filter(r => r.isCorrect).length);
const visionTotalHits = computed(() => visionHitsOD.value + visionHitsOI.value);
const visionTotalTested = computed(() => visionResultsOD.value.length + visionResultsOI.value.length);
const visionPct = computed(() => visionTotalTested.value > 0 ? Math.round((visionTotalHits.value / visionTotalTested.value) * 100) : 0);

const bestSnellenOD = computed(() => {
  const correct = visionResultsOD.value.filter(r => r.isCorrect);
  return correct.length > 0 ? correct[correct.length - 1].snellen : 'Menor a 20/100';
});

const bestSnellenOI = computed(() => {
  const correct = visionResultsOI.value.filter(r => r.isCorrect);
  return correct.length > 0 ? correct[correct.length - 1].snellen : 'Menor a 20/100';
});

const audioHits = computed(() => audioResults.value.filter(r => r.isCorrect).length);
const audioPct = computed(() => Math.round((audioHits.value / audioTotalRounds) * 100));

const isApproved = computed(() => {
  const avg = typeof currentAvgMs.value === 'number' ? currentAvgMs.value : 999;
  return visionHitsOD.value >= 3 && visionHitsOI.value >= 3 && audioHits.value >= 3 && avg <= 650 && reactionFalseAlarms.value <= 3;
});

const verdictClass = computed(() => isApproved.value ? 'apto' : 'no-apto');

const verdictOutcome = computed(() => {
  if (isApproved.value) {
    const avg = typeof currentAvgMs.value === 'number' ? currentAvgMs.value : 999;
    if (visionHitsOD.value === 5 && visionHitsOI.value === 5 && audioHits.value === 5 && avg < 380) {
      return 'APTO (CALIFICACIÓN SOBRESALIENTE)';
    } else if (visionHitsOD.value < 4 || visionHitsOI.value < 4) {
      return 'APTO CON CONDICIÓN (REQUIERE LENTES)';
    } else {
      return 'APTO PARA CONDUCCIÓN DE VEHÍCULOS';
    }
  }
  return 'NO APTO TEMPORAL (REQUIERE REVALORACIÓN)';
});

const verdictNotes = computed(() => {
  if (isApproved.value) {
    if (visionHitsOD.value < 4 || visionHitsOI.value < 4) {
      return 'Aprobado condicionado al uso obligatorio de cristales correctores para conducción vial según la agudeza monocular obtenida en OD y OI.';
    }
    return 'El postulante satisface plenamente los requisitos psicofísicos y sensoriales mínimos en ambos ojos, audición a ciegas y reflejos en 2s.';
  }
  return 'Uno o más parámetros (visión de OD u OI con tiempo, audiometría a ciegas o reflejos en 2s) no alcanzaron el estándar reglamentario.';
});

const allVisionResultsCombined = computed(() => {
  return [...visionResultsOD.value, ...visionResultsOI.value];
});

const currentDateFormatted = computed(() => {
  const d = new Date();
  return `Fecha de Examen: ${d.toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - ${d.toLocaleTimeString()}`;
});

function printReport() {
  window.print();
}

function resetAllTests() {
  clearVisionTimers();
  clearAudioTimers();
  clearReactionTimers();
  isReactionRunning = false;
  currentEye.value = 'OD';
  eyePhase.value = 'test';
  visionResultsOD.value = [];
  visionResultsOI.value = [];
  audioResults.value = [];
  reactionResults.value = null;
  currentStage.value = 'intro';
  showToast('Evaluación reiniciada. Memoria limpia.', 'info');
}

// Eventos de teclado global
function onKeydown(e) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }

  if (currentStage.value === 'vision' && eyePhase.value === 'test') {
    if (e.key === 'ArrowUp') handleVisionAnswer('up');
    else if (e.key === 'ArrowDown') handleVisionAnswer('down');
    else if (e.key === 'ArrowLeft') handleVisionAnswer('left');
    else if (e.key === 'ArrowRight') handleVisionAnswer('right');
  } else if (currentStage.value === 'audio') {
    if (isAudioWaiting.value) {
      if (e.key === 'ArrowLeft') handleAudioAnswer('left');
      else if (e.key === 'ArrowRight') handleAudioAnswer('right');
      else if (e.key === ' ' || e.code === 'Space') handleAudioAnswer('none');
    }
  } else if (currentStage.value === 'reaction') {
    if (e.key === ' ' || e.code === 'Space') {
      handleReactionTrigger();
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  clearVisionTimers();
  clearAudioTimers();
  clearReactionTimers();
});
</script>

<template>
  <div class="app-background">
    <div class="glow-orb orb-1"></div>
    <div class="glow-orb orb-2"></div>
    <div class="glow-orb orb-3"></div>
    <div class="medical-grid-overlay"></div>
  </div>

  <main class="app-container">
    <!-- Encabezado Oficial -->
    <header class="official-header">
      <div class="brand-group">
        <div class="seal-badge">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <span>EVALUACIÓN MÉDICA VIRTUAL (VUE 3)</span>
        </div>
        <h1 class="system-title">SIMULADOR PSICOFÍSICO <span>INTRANT</span></h1>
      </div>
      <div class="privacy-badge">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
        <span>Sin almacenamiento ni recopilación de datos</span>
      </div>
    </header>

    <!-- Stepper de Fases -->
    <nav class="phase-stepper" aria-label="Progreso de evaluación">
      <div class="step-node" :class="{ active: currentStage === 'intro', completed: currentStage !== 'intro' }">
        <span class="step-num">0</span>
        <span class="step-label">Inicio</span>
      </div>
      <div class="step-connector"></div>
      <div class="step-node" :class="{ active: currentStage === 'vision', completed: ['audio', 'reaction', 'results'].includes(currentStage) }">
        <span class="step-num">1</span>
        <span class="step-label">Visión (OD + OI)</span>
      </div>
      <div class="step-connector"></div>
      <div class="step-node" :class="{ active: currentStage === 'audio', completed: ['reaction', 'results'].includes(currentStage) }">
        <span class="step-num">2</span>
        <span class="step-label">Audiometría</span>
      </div>
      <div class="step-connector"></div>
      <div class="step-node" :class="{ active: currentStage === 'reaction', completed: currentStage === 'results' }">
        <span class="step-num">3</span>
        <span class="step-label">Reflejos</span>
      </div>
      <div class="step-connector"></div>
      <div class="step-node" :class="{ active: currentStage === 'results' }">
        <span class="step-num">4</span>
        <span class="step-label">Dictamen</span>
      </div>
    </nav>

    <!-- Contenedor Principal de Pantallas -->
    <section class="test-viewport">
      
      <!-- PANTALLA 0: INTRODUCCIÓN -->
      <article v-if="currentStage === 'intro'" class="view-panel active">
        <div class="intro-hero">
          <div class="status-chip ready">
            <span class="pulse-dot"></span>
            SISTEMA CALIBRADO Y LISTO
          </div>
          <h2 class="hero-heading">Pruebas Sensoriales y Psicométricas</h2>
          <p class="hero-desc">
            Evaluación psicofísica para conductores: <strong>Agudeza Visual Bilateral (Ojo Derecho y Ojo Izquierdo con letra C cerrada)</strong>, <strong>Localización Auditiva a Ciegas (2.0s)</strong> y <strong>Tiempo de Reacción Cromático (2.0s)</strong>.
          </p>
        </div>

        <div class="test-cards-grid">
          <div class="feature-card">
            <div class="card-icon vision-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h3>1. Visión (1 con cada Ojo)</h3>
            <p>Primero se tapará el <strong>ojo izquierdo</strong> (evaluando el derecho), y luego el <strong>ojo derecho</strong> (evaluando el izquierdo). La letra C es más cerrada por dentro y con hendidura fina (2.5s por intento).</p>
          </div>

          <div class="feature-card">
            <div class="card-icon audio-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
            </div>
            <h3>2. Audiometría a Ciegas (2.0s)</h3>
            <p>Use audífonos. Indique con [← Izq] o [Der →] el canal emisor. La pantalla no delatará el lado. Si hay silencio total, pulse [ESPACIO].</p>
          </div>

          <div class="feature-card">
            <div class="card-icon reaction-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h3>3. Reflejo Verde (2.0s)</h3>
            <p>Toque el botón táctil o pulse [ESPACIO] en menos de 2 segundos <strong>exclusivamente cuando aparezca el círculo VERDE</strong>.</p>
          </div>
        </div>

        <div class="hardware-check-box">
          <div class="check-item">
            <span class="check-badge">Bilateral</span>
            <span>Evaluación monocular separada: 5 intentos OD + 5 intentos OI.</span>
          </div>
          <button type="button" class="btn-sound-test" @pointerdown.prevent="testStereoChannels">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            Probar Sonido Estéreo
          </button>
        </div>

        <div class="action-footer">
          <button type="button" class="btn-primary-action" @pointerdown.prevent="startVisionTest">
            <span>COMENZAR EVALUACIÓN MÉDICA</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </article>

      <!-- PANTALLA 1: PRUEBA DE VISIÓN (OD + OI) -->
      <article v-if="currentStage === 'vision'" class="view-panel active">
        
        <!-- FASE DE EXAMEN ACTIVA (OD u OI) -->
        <template v-if="eyePhase === 'test'">
          <div class="panel-header">
            <div class="test-tag">
              PRUEBA 1 / 3 &bull; AGUDEZA VISUAL
              <span class="eye-indicator-pill">
                {{ currentEye === 'OD' ? 'FASE 1: OJO DERECHO (OD)' : 'FASE 2: OJO IZQUIERDO (OI)' }}
              </span>
            </div>
            <div class="round-tracker">
              <span>Intento:</span>
              <strong>{{ visionRound + 1 }} / {{ visionTotalRounds }}</strong>
            </div>
          </div>

          <!-- Banner dinámico según el ojo activo -->
          <div class="instruction-banner warning-banner">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
            <div v-if="currentEye === 'OD'">
              <strong>INSTRUCCIÓN CLÍNICA:</strong> Tápese el <strong>OJO IZQUIERDO</strong> con una mano sin presionar el globo ocular. Mire fijamente la pantalla con su <strong>OJO DERECHO</strong>. Tiene 2.5s por intento.
            </div>
            <div v-else>
              <strong>INSTRUCCIÓN CLÍNICA:</strong> Tápese el <strong>OJO DERECHO</strong> con una mano sin presionar el globo ocular. Mire fijamente la pantalla con su <strong>OJO IZQUIERDO</strong>. Tiene 2.5s por intento.
            </div>
          </div>

          <div class="optotype-stage">
            <div class="crosshair-guide"></div>
            <div class="vision-countdown-badge" :class="{ urgent: visionIsUrgent }">Tiempo: {{ visionTimeRemaining }}</div>
            <div class="optotype-container">
              <svg viewBox="0 0 100 100" class="landolt-ring" :style="{ width: `${currentRoundData.sizePx}px`, height: `${currentRoundData.sizePx}px` }" v-html="currentLandoltSvg"></svg>
            </div>
            <div class="snellen-scale-badge">Escala: {{ currentRoundData.snellen }} ({{ currentRoundData.difficulty }})</div>
          </div>

          <div class="interaction-hints">
            <p class="hint-text">Identifique la abertura de la letra C cerrada hacia cuál de las <strong>4 direcciones</strong> apunta:</p>
            <div class="dpad-controller">
              <button class="dpad-btn up" @pointerdown.prevent="handleVisionAnswer('up')" title="Apertura hacia Arriba">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                <kbd>&uarr; Arriba</kbd>
              </button>
              <div class="dpad-row">
                <button class="dpad-btn left" @pointerdown.prevent="handleVisionAnswer('left')" title="Apertura hacia la Izquierda">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  <kbd>&larr; Izq</kbd>
                </button>
                <div class="dpad-center-badge">
                  <span>{{ currentEye }}</span>
                </div>
                <button class="dpad-btn right" @pointerdown.prevent="handleVisionAnswer('right')" title="Apertura hacia la Derecha">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  <kbd>Der &rarr;</kbd>
                </button>
              </div>
              <button class="dpad-btn down" @pointerdown.prevent="handleVisionAnswer('down')" title="Apertura hacia Abajo">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                <kbd>&darr; Abajo</kbd>
              </button>
            </div>
          </div>

          <div class="round-progress-bar">
            <div class="progress-fill" :style="{ width: `${((visionRound + 1) / visionTotalRounds) * 100}%` }"></div>
          </div>
        </template>

        <!-- PANTALLA INTERMEDIA: CAMBIO DE OJO -->
        <template v-else-if="eyePhase === 'transition'">
          <div class="eye-switch-card">
            <div class="eye-switch-icon">
              <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M21 3l-6 6M15 3h6v6"/>
              </svg>
            </div>
            <div class="eye-switch-badge">OJO DERECHO COMPLETADO</div>
            <h3>¡Excelente! Ahora cambie de ojo</h3>
            <p>
              Descubra su <strong>ojo izquierdo</strong> y ahora <strong>tápese el ojo derecho</strong> con la mano sin presionar el globo ocular.
            </p>
            <button class="btn-primary-action" @pointerdown.prevent="continueWithLeftEye">
              <span>CONTINUAR CON OJO IZQUIERDO (5 INTENTOS)</span>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </template>

      </article>

      <!-- PANTALLA 2: PRUEBA DE AUDIOMETRÍA -->
      <article v-if="currentStage === 'audio'" class="view-panel active">
        <div class="panel-header">
          <div class="test-tag">PRUEBA 2 / 3 &bull; LOCALIZACIÓN AUDITIVA (A CIEGAS)</div>
          <div class="round-tracker">
            <span>Intento:</span>
            <strong>{{ audioRound + 1 }} / {{ audioTotalRounds }}</strong>
          </div>
        </div>

        <div class="instruction-banner info-banner">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div>
            <strong>INSTRUCCIÓN CLÍNICA:</strong> Escuche con atención sus audífonos. <strong>La pantalla NO indicará de qué lado suena.</strong> Tiene exactamente <strong>2 segundos</strong> para responder: [← Izquierda], [→ Derecha] o [ESPACIO] si no escucha nada.
          </div>
        </div>

        <div class="audio-stage">
          <div class="blind-audiometer-rig">
            <div class="ear-channel-blind">
              <div class="ear-icon-neutral">
                <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M6 9a6 6 0 0 1 12 0v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a6 6 0 0 1 6-6"/>
                </svg>
              </div>
              <span class="subtext">Canal Izquierdo (L)</span>
            </div>

            <div class="audio-timer-center">
              <div class="audio-countdown-ring" :class="{ urgent: audioIsUrgent }">
                <span class="countdown-seconds">{{ audioTimeRemaining }}</span>
                <span class="countdown-label">Tiempo límite</span>
              </div>
              <div class="audio-status-pill">{{ audioStateLabel }}</div>
            </div>

            <div class="ear-channel-blind">
              <div class="ear-icon-neutral">
                <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M18 9a6 6 0 0 0-12 0v5a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V9a6 6 0 0 0-6-6"/>
                </svg>
              </div>
              <span class="subtext">Canal Derecho (R)</span>
            </div>
          </div>
        </div>

        <div class="audio-response-controls">
          <button class="audio-resp-btn btn-left" @pointerdown.prevent="handleAudioAnswer('left')">
            <kbd>&larr;</kbd>
            <div class="btn-text-wrap">
              <strong>Oído Izquierdo</strong>
              <small>Flecha Izquierda</small>
            </div>
          </button>

          <button class="audio-resp-btn btn-none" @pointerdown.prevent="handleAudioAnswer('none')">
            <kbd>ESPACIO</kbd>
            <div class="btn-text-wrap">
              <strong>No escucho nada</strong>
              <small>Silencio detectado</small>
            </div>
          </button>

          <button class="audio-resp-btn btn-right" @pointerdown.prevent="handleAudioAnswer('right')">
            <div class="btn-text-wrap">
              <strong>Oído Derecho</strong>
              <small>Flecha Derecha</small>
            </div>
            <kbd>&rarr;</kbd>
          </button>
        </div>

        <div class="round-progress-bar">
          <div class="progress-fill" :style="{ width: `${((audioRound + 1) / audioTotalRounds) * 100}%` }"></div>
        </div>
      </article>

      <!-- PANTALLA 3: PRUEBA DE REFLEJOS -->
      <article v-if="currentStage === 'reaction'" class="view-panel active">
        <div class="panel-header">
          <div class="test-tag">PRUEBA 3 / 3 &bull; TIEMPO DE REACCIÓN CROMÁTICO</div>
          <div class="round-tracker">
            <span>Aciertos:</span>
            <strong>{{ reactionSuccessCount }} / {{ reactionTargetCount }}</strong>
          </div>
        </div>

        <div class="instruction-banner danger-banner">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong>INSTRUCCIÓN CLÍNICA:</strong> Tiene un límite estricto de <strong>2 segundos</strong> para tocar o presionar [ESPACIO] al ver el círculo <strong>VERDE</strong>. ¡NO toque si es Rojo, Amarillo ni Azul!
          </div>
        </div>

        <div class="reaction-arena">
          <div class="traffic-light-rig">
            <div class="stimulus-light" :class="[currentColor ? currentColor.cssClass : 'color-off']">
              <span class="stimulus-hint">{{ currentColor ? currentColor.name.toUpperCase() : 'Esperando estímulo...' }}</span>
            </div>
            <div class="reaction-countdown-badge" :class="{ urgent: reactionIsUrgent }">Tiempo: {{ reactionTimeRemaining }}</div>
          </div>

          <div class="reaction-telemetry">
            <div class="telemetry-item">
              <span class="telem-label">Último Tiempo</span>
              <span class="telem-val">{{ lastReactionMs }} ms</span>
            </div>
            <div class="telemetry-item">
              <span class="telem-label">Falsas Alarmas</span>
              <span class="telem-val danger-text">{{ reactionFalseAlarms }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telem-label">Promedio Actual</span>
              <span class="telem-val">{{ currentAvgMs }} ms</span>
            </div>
          </div>

          <div class="spacebar-prompt-area">
            <button class="spacebar-giant-btn" type="button" @pointerdown.prevent="handleReactionTrigger" aria-label="Pulsar o tocar cuando aparezca el color verde">
              <div class="space-icon-row">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <kbd class="space-kbd">ESPACIO O TOQUE</kbd>
              </div>
              <span class="touch-highlight-text">¡PULSAR / TOCAR AL VER VERDE!</span>
              <small class="touch-subtext">Respuesta instantánea para móvil y PC</small>
            </button>
          </div>
        </div>

        <div class="round-progress-bar">
          <div class="progress-fill" :style="{ width: `${(reactionSuccessCount / reactionTargetCount) * 100}%` }"></div>
        </div>
      </article>

      <!-- PANTALLA 4: RESULTADOS -->
      <article v-if="currentStage === 'results'" class="view-panel active">
        <div class="results-header">
          <div class="official-crest">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <h2>INFORME DE APTITUD PSICOFÍSICA PARA CONDUCCIÓN</h2>
          <p class="results-sub">Simulación Clínica de Evaluación Sensorial y Perceptiva &bull; Conforme al protocolo INTRANT</p>
          <div class="evaluation-date">{{ currentDateFormatted }}</div>
        </div>

        <div class="verdict-banner" :class="verdictClass">
          <div class="verdict-status-icon">
            <svg v-if="isApproved" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div class="verdict-text-block">
            <span class="verdict-title">DICTAMEN FINAL:</span>
            <strong class="verdict-outcome">{{ verdictOutcome }}</strong>
            <p class="verdict-observation">{{ verdictNotes }}</p>
          </div>
        </div>

        <div class="metrics-summary-grid">
          <!-- Visión Monocular Bilateral -->
          <div class="metric-card">
            <div class="mcard-top">
              <span class="mcard-title">1. Agudeza Visual (OD + OI)</span>
              <span class="mcard-badge">{{ visionPct }}%</span>
            </div>
            <div class="mcard-value">{{ visionTotalHits }} / {{ visionTotalTested }}</div>
            <div class="mcard-detail">
              OD: <strong>{{ bestSnellenOD }}</strong> &bull; OI: <strong>{{ bestSnellenOI }}</strong>
            </div>
            <p class="mcard-eval">Evaluación monocular independiente con letra C cerrada y hendidura fina.</p>
          </div>

          <!-- Audiometría a Ciegas -->
          <div class="metric-card">
            <div class="mcard-top">
              <span class="mcard-title">2. Audiometría Estéreo</span>
              <span class="mcard-badge">{{ audioPct }}%</span>
            </div>
            <div class="mcard-value">{{ audioHits }} / {{ audioTotalRounds }}</div>
            <div class="mcard-detail">Percepción a ciegas: <strong>{{ audioHits >= 4 ? 'Normal' : 'Déficit' }}</strong></div>
            <p class="mcard-eval">Discriminación acústica sin pistas visuales en ventana de 2.0s.</p>
          </div>

          <!-- Reflejo y Reacción -->
          <div class="metric-card">
            <div class="mcard-top">
              <span class="mcard-title">3. Reflejo & Reacción</span>
              <span class="mcard-badge">{{ currentAvgMs }} ms</span>
            </div>
            <div class="mcard-value">{{ reactionSuccessCount }} Aciertos</div>
            <div class="mcard-detail">Falsas alarmas: <strong>{{ reactionFalseAlarms }} fallos</strong></div>
            <p class="mcard-eval">Velocidad refleja psicomotriz ante el estímulo verde (&lt;2.0s).</p>
          </div>
        </div>

        <div class="detailed-breakdown">
          <h3>Detalle Clínico de Intentos</h3>
          <div class="table-responsive">
            <table class="report-table">
              <thead>
                <tr>
                  <th>Prueba</th>
                  <th>Ojo / Canal</th>
                  <th>Intento</th>
                  <th>Estímulo</th>
                  <th>Respuesta</th>
                  <th>Resultado</th>
                  <th>Métrica</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in allVisionResultsCombined" :key="'vis-all-' + idx">
                  <td><strong>Agudeza Visual C</strong></td>
                  <td><strong>{{ r.eye }}</strong></td>
                  <td>Ronda {{ r.round }}</td>
                  <td>Apertura {{ r.expected }}</td>
                  <td>{{ r.given }}</td>
                  <td><span :class="r.isCorrect ? 'tag-success' : 'tag-fail'">{{ r.isCorrect ? 'ACIERTO' : 'FALLO' }}</span></td>
                  <td>{{ r.timeMs ? `${r.timeMs} ms (${r.snellen})` : r.snellen }}</td>
                </tr>
                <tr v-for="r in audioResults" :key="'aud-' + r.round">
                  <td><strong>Audiometría A Ciegas</strong></td>
                  <td>Bilateral</td>
                  <td>Ronda {{ r.round }}</td>
                  <td>{{ r.targetLabel }}</td>
                  <td>{{ r.givenLabel }}</td>
                  <td><span :class="r.isCorrect ? 'tag-success' : 'tag-fail'">{{ r.isCorrect ? 'ACIERTO' : 'FALLO' }}</span></td>
                  <td>{{ r.timeMs ? `${r.timeMs} ms / 2.0s` : '2.0s' }}</td>
                </tr>
                <tr v-for="(h, idx) in reactionHistory" :key="'react-' + idx">
                  <td><strong>Reflejo Semáforo</strong></td>
                  <td>Cromático</td>
                  <td>Evento {{ idx + 1 }}</td>
                  <td>Color {{ h.color }}</td>
                  <td>Toque Táctil / Espacio</td>
                  <td><span :class="h.color === 'Verde' ? 'tag-success' : 'tag-fail'">{{ h.color === 'Verde' ? 'ACERTADO' : 'PENALIZADO' }}</span></td>
                  <td>{{ h.reactionMs > 0 ? `${h.reactionMs} ms` : h.outcome }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="no-records-disclaimer">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span><strong>Recordatorio de Privacidad:</strong> Esta sesión es 100% volátil en Vue 3. Ningún resultado, dato personal ni estadística se envía a ningún servidor ni se almacena en memoria permanente.</span>
        </div>

        <div class="results-actions-bar">
          <button type="button" class="btn-secondary" @click="printReport">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir / Guardar PDF
          </button>
          <button type="button" class="btn-primary-action" @click="resetAllTests">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
            </svg>
            Nueva Evaluación
          </button>
        </div>
      </article>

    </section>

    <!-- Toast flotante reactivo -->
    <div class="toast-feedback" :class="[{ visible: toastVisible }, `toast-${toastType}`]" role="status" aria-live="polite">
      {{ toastText }}
    </div>
  </main>
</template>
