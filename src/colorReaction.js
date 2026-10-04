// ==========================================================================
// MÓDULO DE REFLEJOS Y TIEMPO DE REACCIÓN CROMÁTICO (SEMÁFORO)
// Límite de respuesta: 2.0 segundos
// ==========================================================================

export const REACTION_COLORS = [
  { id: 'red',    name: 'Rojo',     isTarget: false, cssClass: 'color-red' },
  { id: 'yellow', name: 'Amarillo', isTarget: false, cssClass: 'color-yellow' },
  { id: 'blue',   name: 'Azul',     isTarget: false, cssClass: 'color-blue' },
  { id: 'green',  name: 'Verde',    isTarget: true,  cssClass: 'color-green' }
];

export class ReactionTester {
  /**
   * @param {Object} options
   * @param {Function} options.onStimulusChange (colorObj | null) => void
   * @param {Function} options.onTick (remainingSecondsFormatted, isUrgent) => void
   * @param {Function} options.onSuccessTarget (reactionMs, roundIndex) => void
   * @param {Function} options.onFalseAlarm (triggerColor) => void
   * @param {Function} options.onTimeout (colorName) => void
   * @param {Function} options.onComplete (results) => void
   */
  constructor(options) {
    this.opts = options;
    this.targetSuccessCount = 5;
    this.currentSuccessCount = 0;
    this.falseAlarms = 0;
    this.reactionTimes = [];
    this.attemptsHistory = [];

    this.currentColor = null;
    this.stimulusStartTime = null;
    this.timerId = null;
    this.countdownInterval = null;
    this.isRunning = false;
    this.timeLimitMs = 2000; // 2 segundos exactos
  }

  start() {
    this.isRunning = true;
    this.currentSuccessCount = 0;
    this.falseAlarms = 0;
    this.reactionTimes = [];
    this.attemptsHistory = [];
    this.scheduleNextStimulus();
  }

  stop() {
    this.isRunning = false;
    this.clearAllTimers();
    this.currentColor = null;
    if (this.opts.onStimulusChange) {
      this.opts.onStimulusChange(null);
    }
    if (this.opts.onTick) {
      this.opts.onTick('2.0s', false);
    }
  }

  clearAllTimers() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  scheduleNextStimulus() {
    if (!this.isRunning) return;

    this.clearAllTimers();
    this.currentColor = null;
    this.opts.onStimulusChange(null);
    if (this.opts.onTick) {
      this.opts.onTick('2.0s', false);
    }

    // Intervalo aleatorio con luz apagada (800ms - 1800ms)
    const pauseMs = 800 + Math.random() * 1000;
    this.timerId = setTimeout(() => {
      if (!this.isRunning) return;
      this.presentStimulus();
    }, pauseMs);
  }

  presentStimulus() {
    // 50% probabilidad de que sea el color VERDE objetivo, 50% distractor (rojo, amarillo o azul)
    const isTarget = Math.random() > 0.45;
    if (isTarget) {
      this.currentColor = REACTION_COLORS.find(c => c.isTarget);
    } else {
      const distractors = REACTION_COLORS.filter(c => !c.isTarget);
      this.currentColor = distractors[Math.floor(Math.random() * distractors.length)];
    }

    this.stimulusStartTime = performance.now();
    this.opts.onStimulusChange(this.currentColor);

    // Iniciar cuenta regresiva de 2.0s
    this.startCountdown(this.timeLimitMs);

    if (this.currentColor.isTarget) {
      // Si es el VERDE: el usuario TIENE 2.0 SEGUNDOS para presionar
      this.timerId = setTimeout(() => {
        if (!this.isRunning) return;
        if (this.currentColor && this.currentColor.isTarget) {
          this.attemptsHistory.push({
            color: 'Verde (Tiempo Agotado)',
            reactionMs: 2000,
            outcome: 'Tiempo Agotado (>2.0s) - No respondió'
          });
          if (this.opts.onTimeout) {
            this.opts.onTimeout('Verde');
          }
          this.scheduleNextStimulus();
        }
      }, this.timeLimitMs);
    } else {
      // Si es un distractor: se muestra durante 1.8 segundos y luego se apaga
      this.timerId = setTimeout(() => {
        if (!this.isRunning) return;
        this.scheduleNextStimulus();
      }, 1800);
    }
  }

  startCountdown(totalMs) {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    const start = performance.now();

    const update = () => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, totalMs - elapsed);
      const seconds = (remaining / 1000).toFixed(1);
      const isUrgent = remaining <= 700;

      if (this.opts.onTick) {
        this.opts.onTick(`${seconds}s`, isUrgent);
      }

      if (remaining <= 0 && this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    };

    update();
    this.countdownInterval = setInterval(update, 50);
  }

  /**
   * Llamado cuando el usuario presiona la barra espaciadora o el botón
   */
  handleUserTrigger() {
    if (!this.isRunning) return null;

    const now = performance.now();
    this.clearAllTimers();

    // Caso 1: Luz apagada (Anticipación incorrecta)
    if (!this.currentColor) {
      this.falseAlarms++;
      this.opts.onFalseAlarm('Luz apagada (Anticipación)');
      this.attemptsHistory.push({
        color: 'Luz apagada',
        reactionMs: 0,
        outcome: 'Falsa Alarma (Anticipación)'
      });
      return { type: 'false_alarm', reason: 'early' };
    }

    // Caso 2: Luz distractora (Rojo, Amarillo, Azul)
    if (!this.currentColor.isTarget) {
      this.falseAlarms++;
      const wrongColor = this.currentColor.name;
      this.opts.onFalseAlarm(wrongColor);
      this.attemptsHistory.push({
        color: wrongColor,
        reactionMs: Math.round(now - this.stimulusStartTime),
        outcome: `Falsa Alarma (Pulsado en ${wrongColor})`
      });
      this.scheduleNextStimulus();
      return { type: 'false_alarm', reason: 'distractor', color: wrongColor };
    }

    // Caso 3: Luz VERDE dentro de los 2 segundos (Acierto objetivo)
    const reactionMs = Math.round(now - this.stimulusStartTime);
    this.reactionTimes.push(reactionMs);
    this.currentSuccessCount++;
    this.attemptsHistory.push({
      color: 'Verde',
      reactionMs,
      outcome: 'Acierto Objetivo'
    });

    this.opts.onSuccessTarget(reactionMs, this.currentSuccessCount);

    if (this.currentSuccessCount >= this.targetSuccessCount) {
      this.finishTest();
      return { type: 'success_complete', reactionMs };
    } else {
      this.scheduleNextStimulus();
      return { type: 'success_round', reactionMs };
    }
  }

  finishTest() {
    this.isRunning = false;
    this.clearAllTimers();
    this.opts.onStimulusChange(null);

    const sum = this.reactionTimes.reduce((acc, v) => acc + v, 0);
    const avgMs = this.reactionTimes.length > 0 ? Math.round(sum / this.reactionTimes.length) : 0;

    const report = {
      successCount: this.currentSuccessCount,
      targetCount: this.targetSuccessCount,
      falseAlarms: this.falseAlarms,
      reactionTimes: this.reactionTimes,
      avgMs,
      history: this.attemptsHistory
    };

    if (this.opts.onComplete) {
      this.opts.onComplete(report);
    }
  }
}
