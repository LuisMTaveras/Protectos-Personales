// ==========================================================================
// SIMULADOR PSICOFÍSICO INTRANT - CONTROLADOR PRINCIPAL
// Pruebas estandarizadas:
// 1. Visión Landolt C (4 Direcciones: Arriba, Abajo, Izq, Der - Límite 2.5s)
// 2. Audiometría a Ciegas (Límite estricto 2.0s, sin pistas visuales)
// 3. Reflejos Cromáticos (Límite estricto 2.0s para responder al Verde)
// Soporte táctil optimizado para dispositivos móviles
// ==========================================================================

import { getAudioContext, playAudiometryTone, playFeedbackSound, testStereoChannels } from './audio.js';
import { VISION_ROUNDS, ORIENTATIONS, renderLandoltSvg } from './landolt.js';
import { ReactionTester } from './colorReaction.js';

const STAGES = {
  INTRO: 'intro',
  VISION: 'vision',
  AUDIO: 'audio',
  REACTION: 'reaction',
  RESULTS: 'results'
};

class IntrantApp {
  constructor() {
    this.currentStage = STAGES.INTRO;

    // Estado de Visión (4 Direcciones + Límite 2.5 Segundos)
    this.visionCurrentRound = 0;
    this.visionTotalRounds = 5;
    this.visionSequence = [];
    this.visionCurrentOrientation = null;
    this.visionResults = [];
    this.visionTimeoutId = null;
    this.visionCountdownInterval = null;
    this.visionRoundStartTime = null;
    this.isVisionWaitingAnswer = false;

    // Estado de Audio (A Ciegas - Límite 2.0 Segundos)
    this.audioCurrentRound = 0;
    this.audioTotalRounds = 5;
    this.audioSequence = [];
    this.audioResults = [];
    this.audioTimeoutId = null;
    this.audioCountdownInterval = null;
    this.audioRoundStartTime = null;
    this.isAudioWaitingAnswer = false;

    // Estado de Reacción (Límite 2.0 Segundos)
    this.reactionTester = null;
    this.reactionResults = null;

    this.initDOMElements();
    this.bindEvents();
    this.updateStageUI();
  }

  initDOMElements() {
    // Vistas principales
    this.views = {
      [STAGES.INTRO]: document.getElementById('viewIntro'),
      [STAGES.VISION]: document.getElementById('viewVision'),
      [STAGES.AUDIO]: document.getElementById('viewAudio'),
      [STAGES.REACTION]: document.getElementById('viewReaction'),
      [STAGES.RESULTS]: document.getElementById('viewResults')
    };

    // Stepper
    this.stepNodes = document.querySelectorAll('.step-node');

    // Botones intro
    this.btnTestSound = document.getElementById('btnTestSound');
    this.btnStartFlow = document.getElementById('btnStartFlow');

    // Elementos Visión
    this.landoltSvg = document.getElementById('landoltSvg');
    this.visionRoundText = document.getElementById('visionRoundText');
    this.visionCountdownBadge = document.getElementById('visionCountdownBadge');
    this.snellenBadge = document.getElementById('snellenBadge');
    this.visionProgressFill = document.getElementById('visionProgressFill');
    this.dpadButtons = document.querySelectorAll('.dpad-btn');

    // Elementos Audio (A Ciegas)
    this.audioRoundText = document.getElementById('audioRoundText');
    this.audioProgressFill = document.getElementById('audioProgressFill');
    this.audioTimerRing = document.getElementById('audioTimerRing');
    this.audioCountdownVal = document.getElementById('audioCountdownVal');
    this.audioStateLabel = document.getElementById('audioStateLabel');
    this.btnAudioLeft = document.getElementById('btnAudioLeft');
    this.btnAudioRight = document.getElementById('btnAudioRight');
    this.btnAudioNone = document.getElementById('btnAudioNone');

    // Elementos Reacción
    this.stimulusLight = document.getElementById('stimulusLight');
    this.stimulusHint = document.getElementById('stimulusHint');
    this.reactionCountdownBadge = document.getElementById('reactionCountdownBadge');
    this.lastReactionMs = document.getElementById('lastReactionMs');
    this.reactionFaults = document.getElementById('reactionFaults');
    this.currentAvgMs = document.getElementById('currentAvgMs');
    this.reactionRoundText = document.getElementById('reactionRoundText');
    this.reactionProgressFill = document.getElementById('reactionProgressFill');
    this.btnReactionTrigger = document.getElementById('btnReactionTrigger');

    // Elementos Resultados
    this.verdictBanner = document.getElementById('verdictBanner');
    this.verdictOutcome = document.getElementById('verdictOutcome');
    this.verdictNotes = document.getElementById('verdictNotes');
    this.verdictIcon = document.getElementById('verdictIcon');
    this.mVisionScore = document.getElementById('mVisionScore');
    this.mVisionBadge = document.getElementById('mVisionBadge');
    this.mVisionSnellen = document.getElementById('mVisionSnellen');
    this.mVisionEval = document.getElementById('mVisionEval');
    this.mAudioScore = document.getElementById('mAudioScore');
    this.mAudioBadge = document.getElementById('mAudioBadge');
    this.mAudioStatus = document.getElementById('mAudioStatus');
    this.mAudioEval = document.getElementById('mAudioEval');
    this.mReactionScore = document.getElementById('mReactionScore');
    this.mReactionBadge = document.getElementById('mReactionBadge');
    this.mReactionFaults = document.getElementById('mReactionFaults');
    this.mReactionEval = document.getElementById('mReactionEval');
    this.detailedTableBody = document.getElementById('detailedTableBody');
    this.evaluationDateStamp = document.getElementById('evaluationDateStamp');
    this.btnPrintReport = document.getElementById('btnPrintReport');
    this.btnRestartTest = document.getElementById('btnRestartTest');

    // Toast flotante
    this.toast = document.getElementById('toastFeedback');
  }

  bindEvents() {
    // Calibración de audio
    this.btnTestSound.addEventListener('click', async () => {
      this.showToast('Probando canal izquierdo y canal derecho...', 'info');
      await testStereoChannels();
      this.showToast('Prueba estéreo completada', 'success');
    });

    // Iniciar flujo con pointerdown para latencia cero
    this.btnStartFlow.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      getAudioContext();
      this.startVisionTest();
    });

    // Clicks y toques táctiles en D-pad de visión (4 direcciones)
    this.dpadButtons.forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        this.handleVisionAnswer(dir);
      });
    });

    // Botones de respuesta de audio con respuesta táctil inmediata
    this.btnAudioLeft.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.handleAudioAnswer('left');
    });
    this.btnAudioRight.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.handleAudioAnswer('right');
    });
    this.btnAudioNone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.handleAudioAnswer('none');
    });

    // Botón gigante de reacción táctil
    this.btnReactionTrigger.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.currentStage === STAGES.REACTION && this.reactionTester) {
        this.btnReactionTrigger.classList.add('pressed');
        setTimeout(() => this.btnReactionTrigger.classList.remove('pressed'), 140);
        this.reactionTester.handleUserTrigger();
      }
    });

    // Botones de informe final
    this.btnPrintReport.addEventListener('click', () => {
      window.print();
    });

    this.btnRestartTest.addEventListener('click', () => {
      this.resetAllTests();
    });

    // Soporte para teclado físico (flechas y barra espaciadora)
    window.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
  }

  handleGlobalKeydown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (this.currentStage === STAGES.VISION) {
      if (e.key === 'ArrowUp') this.handleVisionAnswer('up');
      else if (e.key === 'ArrowDown') this.handleVisionAnswer('down');
      else if (e.key === 'ArrowLeft') this.handleVisionAnswer('left');
      else if (e.key === 'ArrowRight') this.handleVisionAnswer('right');
    } else if (this.currentStage === STAGES.AUDIO) {
      if (this.isAudioWaitingAnswer) {
        if (e.key === 'ArrowLeft') this.handleAudioAnswer('left');
        else if (e.key === 'ArrowRight') this.handleAudioAnswer('right');
        else if (e.key === ' ' || e.code === 'Space') this.handleAudioAnswer('none');
      }
    } else if (this.currentStage === STAGES.REACTION) {
      if (e.key === ' ' || e.code === 'Space') {
        this.btnReactionTrigger.classList.add('pressed');
        setTimeout(() => this.btnReactionTrigger.classList.remove('pressed'), 120);
        if (this.reactionTester) {
          this.reactionTester.handleUserTrigger();
        }
      }
    }
  }

  updateStageUI() {
    Object.keys(this.views).forEach(stage => {
      if (stage === this.currentStage) {
        this.views[stage].classList.add('active');
      } else {
        this.views[stage].classList.remove('active');
      }
    });

    const stageOrder = [STAGES.INTRO, STAGES.VISION, STAGES.AUDIO, STAGES.REACTION, STAGES.RESULTS];
    const currentIndex = stageOrder.indexOf(this.currentStage);

    this.stepNodes.forEach((node, idx) => {
      node.classList.remove('active', 'completed');
      if (idx === currentIndex) {
        node.classList.add('active');
      } else if (idx < currentIndex) {
        node.classList.add('completed');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showToast(message, type = 'info') {
    this.toast.textContent = message;
    this.toast.className = `toast-feedback visible toast-${type}`;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast.classList.remove('visible');
    }, 2200);
  }

  // ==========================================================================
  // PRUEBA 1: AGUDEZA VISUAL (4 DIRECCIONES + LÍMITE DE 2.5 SEGUNDOS)
  // ==========================================================================
  startVisionTest() {
    this.currentStage = STAGES.VISION;
    this.visionCurrentRound = 0;
    this.visionResults = [];
    this.isVisionWaitingAnswer = false;

    // Garantizar que las 4 direcciones principales aparezcan en los 5 intentos
    const allFour = [...ORIENTATIONS].sort(() => Math.random() - 0.5);
    const fifthExtra = ORIENTATIONS[Math.floor(Math.random() * ORIENTATIONS.length)];
    this.visionSequence = [...allFour, fifthExtra].sort(() => Math.random() - 0.5);

    this.updateStageUI();
    this.nextVisionRound();
  }

  clearVisionTimers() {
    if (this.visionTimeoutId) {
      clearTimeout(this.visionTimeoutId);
      this.visionTimeoutId = null;
    }
    if (this.visionCountdownInterval) {
      clearInterval(this.visionCountdownInterval);
      this.visionCountdownInterval = null;
    }
  }

  nextVisionRound() {
    if (this.visionCurrentRound >= this.visionTotalRounds) {
      this.finishVisionTest();
      return;
    }

    this.clearVisionTimers();
    this.isVisionWaitingAnswer = true;

    const roundData = VISION_ROUNDS[this.visionCurrentRound];
    this.visionCurrentOrientation = this.visionSequence[this.visionCurrentRound];

    // Actualizar UI
    this.visionRoundText.textContent = `${this.visionCurrentRound + 1} / ${this.visionTotalRounds}`;
    this.snellenBadge.textContent = `Escala: ${roundData.snellen} (${roundData.difficulty})`;
    this.visionProgressFill.style.width = `${((this.visionCurrentRound + 1) / this.visionTotalRounds) * 100}%`;

    // Renderizar Landolt C SVG
    this.landoltSvg.style.width = `${roundData.sizePx}px`;
    this.landoltSvg.style.height = `${roundData.sizePx}px`;
    this.landoltSvg.innerHTML = renderLandoltSvg(this.visionCurrentOrientation.id, roundData.sizePx);

    // Animación de entrada
    this.landoltSvg.style.transform = 'scale(0.8)';
    setTimeout(() => {
      this.landoltSvg.style.transform = 'scale(1)';
    }, 30);

    // Iniciar temporizador de 2.5 segundos
    this.visionRoundStartTime = performance.now();
    this.startVisionCountdown(2500);

    this.visionTimeoutId = setTimeout(() => {
      if (this.isVisionWaitingAnswer) {
        this.handleVisionTimeout();
      }
    }, 2500);
  }

  startVisionCountdown(totalMs) {
    const start = performance.now();
    this.visionCountdownBadge.classList.remove('urgent');

    const update = () => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, totalMs - elapsed);
      const secs = (remaining / 1000).toFixed(1);

      this.visionCountdownBadge.textContent = `Tiempo: ${secs}s`;

      if (remaining <= 800) {
        this.visionCountdownBadge.classList.add('urgent');
      } else {
        this.visionCountdownBadge.classList.remove('urgent');
      }

      if (remaining <= 0 && this.visionCountdownInterval) {
        clearInterval(this.visionCountdownInterval);
        this.visionCountdownInterval = null;
      }
    };

    update();
    this.visionCountdownInterval = setInterval(update, 50);
  }

  handleVisionAnswer(selectedDir) {
    if (!this.isVisionWaitingAnswer || this.currentStage !== STAGES.VISION) return;

    this.isVisionWaitingAnswer = false;
    this.clearVisionTimers();

    const activeBtn = Array.from(this.dpadButtons).find(b => b.dataset.dir === selectedDir);
    if (activeBtn) {
      activeBtn.classList.add('pressed');
      setTimeout(() => activeBtn.classList.remove('pressed'), 130);
    }

    const roundData = VISION_ROUNDS[this.visionCurrentRound];
    const isCorrect = (selectedDir === this.visionCurrentOrientation.id);
    const responseMs = Math.round(performance.now() - this.visionRoundStartTime);

    playFeedbackSound(isCorrect);

    this.visionResults.push({
      round: this.visionCurrentRound + 1,
      expected: this.visionCurrentOrientation.label,
      expectedId: this.visionCurrentOrientation.id,
      given: ORIENTATIONS.find(o => o.id === selectedDir)?.label || selectedDir,
      isCorrect,
      snellen: roundData.snellen,
      sizePx: roundData.sizePx,
      timeMs: responseMs
    });

    this.visionCurrentRound++;
    setTimeout(() => this.nextVisionRound(), 250);
  }

  handleVisionTimeout() {
    this.isVisionWaitingAnswer = false;
    this.clearVisionTimers();

    const roundData = VISION_ROUNDS[this.visionCurrentRound];
    playFeedbackSound(false);

    this.visionResults.push({
      round: this.visionCurrentRound + 1,
      expected: this.visionCurrentOrientation.label,
      expectedId: this.visionCurrentOrientation.id,
      given: 'Tiempo Agotado (>2.5s)',
      isCorrect: false,
      snellen: roundData.snellen,
      sizePx: roundData.sizePx,
      timeMs: 2500
    });

    this.showToast('¡Tiempo agotado (2.5s)! Se registró como fallo.', 'error');
    this.visionRoundText.textContent = `${this.visionCurrentRound + 1} / ${this.visionTotalRounds}`;
    this.visionCurrentRound++;
    setTimeout(() => this.nextVisionRound(), 400);
  }

  finishVisionTest() {
    this.clearVisionTimers();
    this.showToast('Visión finalizada. Pasando a Audiometría (2s por tono)...', 'success');
    setTimeout(() => {
      this.startAudioTest();
    }, 900);
  }

  // ==========================================================================
  // PRUEBA 2: AUDIOMETRÍA A CIEGAS (LÍMITE DE 2.0 SEGUNDOS)
  // Sin pistas visuales de canal.
  // ==========================================================================
  startAudioTest() {
    this.currentStage = STAGES.AUDIO;
    this.audioCurrentRound = 0;
    this.audioResults = [];
    this.isAudioWaitingAnswer = false;

    // 5 intentos balanceados: izquierda, derecha y silencio
    const pool = ['left', 'right', 'none', 'left', 'right'];
    this.audioSequence = pool.sort(() => Math.random() - 0.5);

    this.updateStageUI();
    this.nextAudioRound();
  }

  clearAudioTimers() {
    if (this.audioTimeoutId) {
      clearTimeout(this.audioTimeoutId);
      this.audioTimeoutId = null;
    }
    if (this.audioCountdownInterval) {
      clearInterval(this.audioCountdownInterval);
      this.audioCountdownInterval = null;
    }
  }

  async nextAudioRound() {
    if (this.audioCurrentRound >= this.audioTotalRounds) {
      this.finishAudioTest();
      return;
    }

    this.clearAudioTimers();
    this.isAudioWaitingAnswer = false;

    const targetChannel = this.audioSequence[this.audioCurrentRound];
    this.audioRoundText.textContent = `${this.audioCurrentRound + 1} / ${this.audioTotalRounds}`;
    this.audioProgressFill.style.width = `${((this.audioCurrentRound + 1) / this.audioTotalRounds) * 100}%`;

    // Estado neutro simétrico
    this.audioTimerRing.classList.remove('urgent');
    this.audioCountdownVal.textContent = '2.0s';
    this.audioStateLabel.textContent = 'Preparando emisión...';

    // Pausa inicial
    await new Promise(r => setTimeout(r, 600));

    // Emitir tono acústico (750ms)
    this.audioStateLabel.textContent = '¡Escuche sus audífonos!';
    const freq = targetChannel === 'none' ? 0 : (850 + Math.floor(Math.random() * 5) * 200);

    // Reproducimos el tono a ciegas
    playAudiometryTone(targetChannel, 750, freq);

    // Ventana de respuesta de 2.0s
    this.isAudioWaitingAnswer = true;
    this.audioRoundStartTime = performance.now();
    this.startAudioCountdown(2000);

    this.audioTimeoutId = setTimeout(() => {
      if (this.isAudioWaitingAnswer) {
        this.handleAudioTimeout();
      }
    }, 2000);
  }

  startAudioCountdown(totalMs) {
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, totalMs - elapsed);
      const secs = (remaining / 1000).toFixed(1);

      this.audioCountdownVal.textContent = `${secs}s`;

      if (remaining <= 700) {
        this.audioTimerRing.classList.add('urgent');
      } else {
        this.audioTimerRing.classList.remove('urgent');
      }

      if (remaining <= 0 && this.audioCountdownInterval) {
        clearInterval(this.audioCountdownInterval);
        this.audioCountdownInterval = null;
      }
    };

    tick();
    this.audioCountdownInterval = setInterval(tick, 50);
  }

  handleAudioAnswer(chosenAnswer) {
    if (!this.isAudioWaitingAnswer || this.currentStage !== STAGES.AUDIO) return;

    this.isAudioWaitingAnswer = false;
    this.clearAudioTimers();

    const targetChannel = this.audioSequence[this.audioCurrentRound];
    const isCorrect = (chosenAnswer === targetChannel);

    playFeedbackSound(isCorrect);

    const labelMap = {
      'left': 'Oído Izquierdo',
      'right': 'Oído Derecho',
      'none': 'Silencio (Ninguno)'
    };

    this.audioResults.push({
      round: this.audioCurrentRound + 1,
      targetChannel,
      targetLabel: labelMap[targetChannel],
      givenChannel: chosenAnswer,
      givenLabel: labelMap[chosenAnswer],
      isCorrect,
      timeMs: Math.round(performance.now() - this.audioRoundStartTime)
    });

    this.audioRoundText.textContent = `${this.audioCurrentRound + 1} / ${this.audioTotalRounds}`;
    this.audioCurrentRound++;
    setTimeout(() => this.nextAudioRound(), 350);
  }

  handleAudioTimeout() {
    this.isAudioWaitingAnswer = false;
    this.clearAudioTimers();

    const targetChannel = this.audioSequence[this.audioCurrentRound];
    playFeedbackSound(false);

    const labelMap = {
      'left': 'Oído Izquierdo',
      'right': 'Oído Derecho',
      'none': 'Silencio (Ninguno)'
    };

    this.audioResults.push({
      round: this.audioCurrentRound + 1,
      targetChannel,
      targetLabel: labelMap[targetChannel],
      givenChannel: 'timeout',
      givenLabel: 'Tiempo Agotado (>2.0s)',
      isCorrect: false,
      timeMs: 2000
    });

    this.showToast('¡Tiempo agotado (2s)! Se contabilizó como fallo.', 'error');
    this.audioRoundText.textContent = `${this.audioCurrentRound + 1} / ${this.audioTotalRounds}`;
    this.audioCurrentRound++;
    setTimeout(() => this.nextAudioRound(), 450);
  }

  finishAudioTest() {
    this.clearAudioTimers();
    this.showToast('Audiometría finalizada. Pasando a Reflejos (2s por color)...', 'success');
    setTimeout(() => {
      this.startReactionTest();
    }, 900);
  }

  // ==========================================================================
  // PRUEBA 3: REFLEJOS & SEMÁFORO (LÍMITE DE 2.0 SEGUNDOS)
  // ==========================================================================
  startReactionTest() {
    this.currentStage = STAGES.REACTION;
    this.updateStageUI();

    this.reactionRoundText.textContent = `0 / 5`;
    this.reactionProgressFill.style.width = '0%';
    this.lastReactionMs.textContent = '-- ms';
    this.reactionFaults.textContent = '0';
    this.currentAvgMs.textContent = '-- ms';
    this.reactionCountdownBadge.textContent = 'Límite: 2.0s';
    this.reactionCountdownBadge.classList.remove('urgent');

    this.reactionTester = new ReactionTester({
      onStimulusChange: (colorObj) => {
        this.stimulusLight.classList.remove('color-red', 'color-yellow', 'color-blue', 'color-green', 'color-off');

        if (!colorObj) {
          this.stimulusLight.classList.add('color-off');
          this.stimulusHint.textContent = 'Esperando estímulo...';
          this.reactionCountdownBadge.textContent = 'Límite: 2.0s';
          this.reactionCountdownBadge.classList.remove('urgent');
        } else {
          this.stimulusLight.classList.add(colorObj.cssClass);
          this.stimulusHint.textContent = colorObj.name.toUpperCase();
        }
      },
      onTick: (remainingStr, isUrgent) => {
        this.reactionCountdownBadge.textContent = `Tiempo: ${remainingStr}`;
        if (isUrgent) {
          this.reactionCountdownBadge.classList.add('urgent');
        } else {
          this.reactionCountdownBadge.classList.remove('urgent');
        }
      },
      onSuccessTarget: (ms, successCount) => {
        playFeedbackSound(true);
        this.lastReactionMs.textContent = `${ms} ms`;
        this.reactionRoundText.textContent = `${successCount} / 5`;
        this.reactionProgressFill.style.width = `${(successCount / 5) * 100}%`;

        const times = this.reactionTester.reactionTimes;
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        this.currentAvgMs.textContent = `${avg} ms`;

        this.showToast(`¡Acierto verde en ${ms} ms!`, 'success');
      },
      onFalseAlarm: (colorName) => {
        playFeedbackSound(false);
        this.reactionFaults.textContent = `${this.reactionTester.falseAlarms}`;
        this.showToast(`¡Falsa Alarma! Tocó con: ${colorName}`, 'error');
      },
      onTimeout: (colorName) => {
        playFeedbackSound(false);
        this.showToast(`¡Tiempo agotado (2.0s)! No tocó a tiempo en ${colorName}.`, 'error');
      },
      onComplete: (report) => {
        this.reactionResults = report;
        this.finishAllTests();
      }
    });

    this.reactionTester.start();
  }

  // ==========================================================================
  // FINALIZACIÓN Y DICTAMEN MÉDICO
  // ==========================================================================
  finishAllTests() {
    this.currentStage = STAGES.RESULTS;
    this.updateStageUI();
    this.generateFinalMedicalReport();
  }

  generateFinalMedicalReport() {
    // 1. Visión (4 Direcciones con límite 2.5s)
    const visionHits = this.visionResults.filter(r => r.isCorrect).length;
    const visionPct = Math.round((visionHits / this.visionTotalRounds) * 100);
    this.mVisionScore.textContent = `${visionHits} / ${this.visionTotalRounds}`;
    this.mVisionBadge.textContent = `${visionPct}%`;

    const correctSnellens = this.visionResults.filter(r => r.isCorrect);
    const bestSnellen = correctSnellens.length > 0 
      ? correctSnellens[correctSnellens.length - 1].snellen 
      : 'Menor a 20/100';
    this.mVisionSnellen.textContent = bestSnellen;

    if (visionHits >= 4) {
      this.mVisionEval.textContent = 'Agudeza visual monocular excelente en las 4 direcciones espaciales con rápida discriminación.';
    } else if (visionHits >= 3) {
      this.mVisionEval.textContent = 'Agudeza visual limítrofe. Se recomienda uso de lentes correctoras para conducir.';
    } else {
      this.mVisionEval.textContent = 'Agudeza visual insuficiente o tiempo de respuesta excedido (>2.5s).';
    }

    // 2. Audio (A Ciegas en 2.0s)
    const audioHits = this.audioResults.filter(r => r.isCorrect).length;
    const audioPct = Math.round((audioHits / this.audioTotalRounds) * 100);
    this.mAudioScore.textContent = `${audioHits} / ${this.audioTotalRounds}`;
    this.mAudioBadge.textContent = `${audioPct}%`;

    if (audioHits >= 4) {
      this.mAudioStatus.textContent = 'Normal / Bilateral Óptima';
      this.mAudioEval.textContent = 'Discriminación acústica a ciegas y tiempo de respuesta (<2s) dentro de la norma.';
    } else {
      this.mAudioStatus.textContent = 'Hipoacusia o Déficit de Tiempo';
      this.mAudioEval.textContent = 'Dificultad para discernir canal o tiempos de respuesta agotados (>2s).';
    }

    // 3. Reacción (Límite 2.0s)
    const avgMs = this.reactionResults.avgMs;
    const falseAlarms = this.reactionResults.falseAlarms;
    this.mReactionScore.textContent = `${this.reactionResults.successCount} Aciertos`;
    this.mReactionBadge.textContent = `${avgMs} ms`;
    this.mReactionFaults.textContent = `${falseAlarms} fallos`;

    if (avgMs <= 400 && falseAlarms <= 1) {
      this.mReactionEval.textContent = 'Excelente velocidad refleja táctil y frenado psicomotriz oportuno.';
    } else if (avgMs <= 600 && falseAlarms <= 3) {
      this.mReactionEval.textContent = 'Tiempo de reacción aceptable dentro del límite de 2 segundos.';
    } else {
      this.mReactionEval.textContent = 'Tiempo de respuesta retardado o recurrencia en falsas alarmas.';
    }

    // 4. Dictamen Global
    const dateNow = new Date();
    this.evaluationDateStamp.textContent = `Fecha de Examen: ${dateNow.toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - ${dateNow.toLocaleTimeString()}`;

    const isVisionPass = visionHits >= 3;
    const isAudioPass = audioHits >= 3;
    const isReactionPass = avgMs <= 650 && falseAlarms <= 3;

    const isFullyApproved = isVisionPass && isAudioPass && isReactionPass;

    this.verdictBanner.className = 'verdict-banner';
    if (isFullyApproved) {
      if (visionHits === 5 && audioHits === 5 && avgMs < 380) {
        this.verdictBanner.classList.add('apto');
        this.verdictOutcome.textContent = 'APTO (CALIFICACIÓN SOBRESALIENTE)';
        this.verdictNotes.textContent = 'El evaluado demostró precisión visual en las 4 direcciones (<2.5s), discriminación auditiva a ciegas en <2s y excelentes reflejos psicomotrices.';
      } else if (visionHits < 4) {
        this.verdictBanner.classList.add('apto');
        this.verdictOutcome.textContent = 'APTO CON CONDICIÓN (REQUIERE LENTES)';
        this.verdictNotes.textContent = 'Aprobado para conducir condicionado al uso obligatorio de cristales correctores según la escala Snellen alcanzada.';
      } else {
        this.verdictBanner.classList.add('apto');
        this.verdictOutcome.textContent = 'APTO PARA CONDUCCIÓN DE VEHÍCULOS';
        this.verdictNotes.textContent = 'El postulante satisface plenamente los requisitos psicofísicos y sensoriales mínimos en tiempo y forma.';
      }
      this.verdictIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      `;
    } else {
      this.verdictBanner.classList.add('no-apto');
      this.verdictOutcome.textContent = 'NO APTO TEMPORAL (REQUIERE REVALORACIÓN)';
      this.verdictNotes.textContent = 'Uno o más parámetros (agudeza visual con tiempo, percepción acústica a ciegas o velocidad refleja en 2s) no alcanzaron el umbral reglamentario.';
      this.verdictIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      `;
    }

    this.populateDetailedTable();
  }

  populateDetailedTable() {
    this.detailedTableBody.innerHTML = '';

    // Filas de Visión (4 Direcciones con tiempo)
    this.visionResults.forEach(r => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>Visión (4 Dirs, 2.5s)</strong></td>
        <td>Ronda ${r.round}</td>
        <td>Apertura ${r.expected}</td>
        <td>${r.given}</td>
        <td><span class="${r.isCorrect ? 'tag-success' : 'tag-fail'}">${r.isCorrect ? 'ACIERTO' : 'FALLO'}</span></td>
        <td>${r.timeMs ? `${r.timeMs} ms (${r.snellen})` : r.snellen}</td>
      `;
      this.detailedTableBody.appendChild(row);
    });

    // Filas de Audio (A Ciegas en 2s)
    this.audioResults.forEach(r => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>Audiometría A Ciegas</strong></td>
        <td>Ronda ${r.round}</td>
        <td>${r.targetLabel}</td>
        <td>${r.givenLabel}</td>
        <td><span class="${r.isCorrect ? 'tag-success' : 'tag-fail'}">${r.isCorrect ? 'ACIERTO' : 'FALLO'}</span></td>
        <td>${r.timeMs ? `${r.timeMs} ms / 2.0s` : '2.0s'}</td>
      `;
      this.detailedTableBody.appendChild(row);
    });

    // Filas de Reacción (Límite 2s)
    if (this.reactionResults && this.reactionResults.history) {
      this.reactionResults.history.forEach((h, idx) => {
        const isHit = h.color === 'Verde';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>Reflejo Semáforo (2s)</strong></td>
          <td>Evento ${idx + 1}</td>
          <td>Color ${h.color}</td>
          <td>Toque Táctil / Espacio</td>
          <td><span class="${isHit ? 'tag-success' : 'tag-fail'}">${isHit ? 'ACERTADO' : 'PENALIZADO'}</span></td>
          <td>${h.reactionMs > 0 ? `${h.reactionMs} ms` : h.outcome}</td>
        `;
        this.detailedTableBody.appendChild(row);
      });
    }
  }

  resetAllTests() {
    this.clearVisionTimers();
    this.clearAudioTimers();
    if (this.reactionTester) {
      this.reactionTester.stop();
      this.reactionTester = null;
    }
    this.visionResults = [];
    this.audioResults = [];
    this.reactionResults = null;
    this.currentStage = STAGES.INTRO;
    this.updateStageUI();
    this.showToast('Evaluación reiniciada. Memoria limpia.', 'info');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new IntrantApp();
});
