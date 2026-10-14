/**
 * Web Audio API Sound Synthesizer
 * Zero-asset audio cues for ride matching, arrival, payments, and SOS siren.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Pleasant chime when a driver is matched
   */
  playMatchSound() {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, this.ctx.currentTime + 0.12); // A5
      osc.frequency.setValueAtTime(1174.66, this.ctx.currentTime + 0.24); // D6

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  /**
   * Double beep when driver arrives at pickup
   */
  playArrivalSound() {
    try {
      this.init();
      if (!this.ctx) return;

      [0, 0.2].forEach((delay) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(784.0, this.ctx!.currentTime + delay); // G5
        gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + delay);
        osc.stop(this.ctx!.currentTime + delay + 0.15);
      });
    } catch (e) {}
  }

  /**
   * Cash register / payment success chime
   */
  playPaymentSound() {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.16); // G5
      osc.frequency.setValueAtTime(1046.5, this.ctx.currentTime + 0.24); // C6

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.8);
    } catch (e) {}
  }

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;

  /**
   * High-priority emergency SOS siren
   */
  playSosSiren() {
    try {
      this.init();
      if (!this.ctx) return;

      this.stopSosSiren();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      this.sirenOsc = osc;
      this.sirenGain = gain;

      osc.type = 'sawtooth';

      // Alternating high-low emergency pitch
      const now = this.ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        osc.frequency.setValueAtTime(960, now + i * 0.4);
        osc.frequency.setValueAtTime(600, now + i * 0.4 + 0.2);
      }

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.8);
      osc.onended = () => {
        if (this.sirenOsc === osc) {
          this.sirenOsc = null;
          this.sirenGain = null;
        }
      };
    } catch (e) {}
  }

  /**
   * Stop active SOS siren immediately
   */
  stopSosSiren() {
    try {
      if (this.sirenGain) {
        this.sirenGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
      }
      if (this.sirenOsc) {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
        this.sirenOsc = null;
      }
      this.sirenGain = null;
    } catch (e) {}
  }
}

export const sounds = new SoundEffects();
