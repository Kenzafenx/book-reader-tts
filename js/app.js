import { PDFHandler } from './pdf-handler.js';
import { EPUBHandler } from './epub-handler.js';
import { TTSEngine } from './tts-engine.js';
import { UIController } from './ui-controller.js';

class App {
    constructor() {
        this.ui = new UIController(this);
        this.tts = new TTSEngine();
        this.pdfHandler = new PDFHandler();
        this.epubHandler = new EPUBHandler();
        this.currentHandler = null;
        this.fileHash = null;
        this.bookData = { title: '', numSections: 0, sections: [] };
        this.currentSectionIndex = 1;
        this.paragraphs = [];
        this.currentParagraphIndex = 0;
        this.init();
    }

    init() {
        this.tts.onVoicesLoaded = (voices) => this.ui.populateVoices(voices);
        this.tts.onEnd = () => this.playNextParagraph();
        this.tts.onError = (e) => console.log("TTS Interrupted/Error:", e);
    }

    reset() {
        this.stopPlayback();
        this.currentHandler = null;
        this.fileHash = null;
        this.bookData = { title: '', numSections: 0, sections: [] };
        this.currentSectionIndex = 1;
        this.paragraphs = [];
        this.currentParagraphIndex = 0;
        this.ui.setBookTitle('No Book Loaded');
        this.ui.showUploadView();
        this.ui.els.fileInput.value = '';
    }

    async handleFileUpload(file) {
        if (!file) return;
        this.ui.showLoading("Parsing document...");
        try {
            this.fileHash = await this.generateFileHash(file);
            const arrayBuffer = await file.arrayBuffer();
            const extension = file.name.split('.').pop().toLowerCase();
            if (extension === 'pdf') {
                this.currentHandler = this.pdfHandler;
            } else if (extension === 'epub') {
                this.currentHandler = this.epubHandler;
            } else {
                throw new Error("Unsupported file format. Please upload PDF or EPUB.");
            }
            this.bookData = await this.currentHandler.load(arrayBuffer);
            this.ui.setBookTitle(this.bookData.title);
            this.ui.renderSidebar(this.bookData.numSections, this.bookData.sections);
            this.ui.showReaderView();
            this.loadProgress();
            await this.loadSection(this.currentSectionIndex);
        } catch (error) {
            console.error(error);
            alert("Error loading book: " + error.message);
            this.ui.showUploadView();
        } finally {
            this.ui.hideLoading();
        }
    }

    async loadSection(index) {
        if (index < 1 || index > this.bookData.numSections) return false;
        this.tts.stop();
        this.ui.showLoading(`Loading section ${index}...`);
        try {
            this.currentSectionIndex = index;
            this.paragraphs = await this.currentHandler.getPageText(index);
            this.ui.updateSectionIndicator(this.currentSectionIndex, this.bookData.numSections);
            this.ui.updateSidebarActive(this.currentSectionIndex);
            this.ui.renderParagraphs(this.paragraphs);
            this.ui.updateProgress((this.currentSectionIndex / this.bookData.numSections) * 100);
            if (this.currentParagraphIndex >= this.paragraphs.length) {
                this.currentParagraphIndex = 0;
            }
            if (this.paragraphs.length > 0) {
                this.ui.highlightParagraph(this.currentParagraphIndex);
            }
            this.saveProgress();
            return true;
        } catch (error) {
            console.error(error);
            alert("Error loading section content.");
            return false;
        } finally {
            this.ui.hideLoading();
        }
    }

    async nextPage() {
        if (this.currentSectionIndex < this.bookData.numSections) {
            this.currentParagraphIndex = 0;
            return await this.loadSection(this.currentSectionIndex + 1);
        }
        return false;
    }

    async prevPage() {
        if (this.currentSectionIndex > 1) {
            this.currentParagraphIndex = 0;
            return await this.loadSection(this.currentSectionIndex - 1);
        }
        return false;
    }

    togglePlayPause() {
        if (this.tts.isSpeaking()) {
            if (this.tts.isPaused()) {
                this.tts.resume();
                this.ui.setPlayState(true);
            } else {
                this.tts.pause();
                this.ui.setPlayState(false);
            }
        } else {
            this.playCurrentParagraph();
        }
    }

    stopPlayback() {
        this.tts.stop();
        this.ui.setPlayState(false);
    }

    playFrom(paragraphIndex) {
        this.currentParagraphIndex = paragraphIndex;
        this.saveProgress();
        this.playCurrentParagraph();
    }

    handleSpeedChange() {
        if (this.tts.isSpeaking() && !this.tts.isPaused()) {
            this.playCurrentParagraph();
        }
    }

    playCurrentParagraph() {
        if (this.paragraphs.length === 0) return;
        if (this.currentParagraphIndex >= this.paragraphs.length) {
            this.nextPage().then((advanced) => {
                if (advanced && this.paragraphs.length > 0) {
                    this.playCurrentParagraph();
                } else {
                    this.ui.setPlayState(false);
                }
            });
            return;
        }
        const text = this.paragraphs[this.currentParagraphIndex];
        const voiceURI = this.ui.getSelectedVoice();
        const rate = this.ui.getSelectedSpeed();
        this.ui.highlightParagraph(this.currentParagraphIndex);
        this.ui.setPlayState(true);
        this.tts.speak(text, voiceURI, rate);
    }

    playNextParagraph() {
        this.currentParagraphIndex++;
        this.saveProgress();
        if (this.currentParagraphIndex < this.paragraphs.length) {
            this.playCurrentParagraph();
        } else {
            this.nextPage().then((advanced) => {
                if (advanced && this.paragraphs.length > 0) {
                    this.playCurrentParagraph();
                } else {
                    this.ui.setPlayState(false);
                }
            });
        }
    }

    async generateFileHash(file) {
        return file.name.replace(/[^a-zA-Z0-9]/g, '') + "_" + file.size;
    }

    saveProgress() {
        if (!this.fileHash) return;
        const state = { section: this.currentSectionIndex, paragraph: this.currentParagraphIndex };
        localStorage.setItem(`br_state_${this.fileHash}`, JSON.stringify(state));
    }

    loadProgress() {
        if (!this.fileHash) return;
        const saved = localStorage.getItem(`br_state_${this.fileHash}`);
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.currentSectionIndex = state.section || 1;
                this.currentParagraphIndex = state.paragraph || 0;
            } catch (e) {
                console.error("Failed to parse saved state");
            }
        } else {
            this.currentSectionIndex = 1;
            this.currentParagraphIndex = 0;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
