export class TTSEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtterance = null;
        this.onVoicesLoaded = null;
        this.onEnd = null;
        this.onError = null;
        this.initVoices();
    }

    initVoices() {
        const load = () => {
            this.voices = this.synth.getVoices().filter(v => v.lang.startsWith('en'));
            if (this.onVoicesLoaded) {
                this.onVoicesLoaded(this.voices);
            }
        };
        load();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = load;
        }
    }

    speak(text, voiceURI, rate) {
        this.stop();
        if (!text || text.trim() === '') {
            if (this.onEnd) this.onEnd();
            return;
        }
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.rate = parseFloat(rate) || 1.0;
        const voice = this.voices.find(v => v.voiceURI === voiceURI);
        if (voice) {
            this.currentUtterance.voice = voice;
        }
        this.currentUtterance.onend = () => {
            if (this.onEnd) this.onEnd();
        };
        this.currentUtterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                if (this.onError) this.onError(e);
            }
        };
        this.synth.speak(this.currentUtterance);
    }

    pause() {
        if (this.synth.speaking && !this.synth.paused) {
            this.synth.pause();
        }
    }

    resume() {
        if (this.synth.paused) {
            this.synth.resume();
        }
    }

    stop() {
        if (this.synth.speaking || this.synth.pending) {
            this.synth.cancel();
        }
    }

    isSpeaking() {
        return this.synth.speaking;
    }

    isPaused() {
        return this.synth.paused;
    }
}
