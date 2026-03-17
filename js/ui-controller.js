export class UIController {
    constructor(app) {
        this.app = app;
        this.els = {
            sidebar: document.getElementById('sidebar'),
            btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
            btnNewBook: document.getElementById('btn-new-book'),
            navList: document.getElementById('nav-list'),
            uploadView: document.getElementById('upload-view'),
            readerView: document.getElementById('reader-view'),
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('file-input'),
            contentContainer: document.getElementById('content-container'),
            bookTitle: document.getElementById('book-title'),
            progressContainer: document.getElementById('progress-container'),
            progressBar: document.getElementById('progress-bar'),
            bottomControls: document.getElementById('bottom-controls'),
            btnPrev: document.getElementById('btn-prev'),
            btnNext: document.getElementById('btn-next'),
            btnPlayPause: document.getElementById('btn-play-pause'),
            btnStop: document.getElementById('btn-stop'),
            pageIndicator: document.getElementById('page-indicator'),
            speedSelect: document.getElementById('speed-select'),
            voiceSelect: document.getElementById('voice-select'),
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text')
        };
        this.attachEventListeners();
    }

    attachEventListeners() {
        this.els.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.els.dropZone.classList.add('drag-active');
        });
        this.els.dropZone.addEventListener('dragleave', () => {
            this.els.dropZone.classList.remove('drag-active');
        });
        this.els.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.els.dropZone.classList.remove('drag-active');
            if (e.dataTransfer.files.length > 0) {
                this.app.handleFileUpload(e.dataTransfer.files[0]);
            }
        });
        this.els.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.app.handleFileUpload(e.target.files[0]);
            }
        });
        this.els.btnToggleSidebar.addEventListener('click', () => {
            this.els.sidebar.classList.toggle('hidden');
        });
        this.els.btnNewBook.addEventListener('click', () => {
            this.app.reset();
        });
        this.els.btnPlayPause.addEventListener('click', () => this.app.togglePlayPause());
        this.els.btnStop.addEventListener('click', () => this.app.stopPlayback());
        this.els.btnNext.addEventListener('click', () => {
            this.app.stopPlayback();
            this.app.nextPage();
        });
        this.els.btnPrev.addEventListener('click', () => {
            this.app.stopPlayback();
            this.app.prevPage();
        });
        this.els.speedSelect.addEventListener('change', () => this.app.handleSpeedChange());
        this.els.voiceSelect.addEventListener('change', () => this.app.handleSpeedChange());
    }

    showUploadView() {
        this.els.uploadView.classList.remove('hidden');
        this.els.readerView.classList.add('hidden');
        this.els.sidebar.classList.add('hidden');
        this.els.bottomControls.classList.add('hidden');
        this.els.progressContainer.classList.add('hidden');
    }

    showReaderView() {
        this.els.uploadView.classList.add('hidden');
        this.els.readerView.classList.remove('hidden');
        this.els.bottomControls.classList.remove('hidden');
        this.els.progressContainer.classList.remove('hidden');
        if (window.innerWidth > 768) {
            this.els.sidebar.classList.remove('hidden');
        }
    }

    showLoading(text = "Loading...") {
        this.els.loadingText.textContent = text;
        this.els.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.els.loadingOverlay.classList.add('hidden');
    }

    setBookTitle(title) {
        this.els.bookTitle.textContent = title;
    }

    renderSidebar(numSections, sections = []) {
        this.els.navList.innerHTML = '';
        for (let i = 1; i <= numSections; i++) {
            const li = document.createElement('li');
            li.textContent = (sections[i-1] && sections[i-1].title) ? sections[i-1].title : `Section ${i}`;
            li.dataset.section = i;
            li.addEventListener('click', () => {
                this.app.loadSection(i);
                if (window.innerWidth <= 768) this.els.sidebar.classList.add('hidden');
            });
            this.els.navList.appendChild(li);
        }
    }

    updateSidebarActive(index) {
        Array.from(this.els.navList.children).forEach(li => {
            if (parseInt(li.dataset.section) === index) {
                li.classList.add('active');
                li.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                li.classList.remove('active');
            }
        });
    }

    renderParagraphs(paragraphs) {
        this.els.contentContainer.innerHTML = '';
        if (paragraphs.length === 0) {
            this.els.contentContainer.innerHTML = '<p class="paragraph"><em>No readable text found on this page.</em></p>';
            return;
        }
        paragraphs.forEach((text, index) => {
            const p = document.createElement('p');
            p.className = 'paragraph';
            p.textContent = text;
            p.dataset.index = index;
            p.addEventListener('click', () => {
                this.app.playFrom(index);
            });
            this.els.contentContainer.appendChild(p);
        });
        this.els.readerView.scrollTop = 0;
    }

    highlightParagraph(index) {
        const paragraphs = this.els.contentContainer.querySelectorAll('.paragraph');
        paragraphs.forEach(p => p.classList.remove('active'));
        const target = this.els.contentContainer.querySelector(`.paragraph[data-index="${index}"]`);
        if (target) {
            target.classList.add('active');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    updateSectionIndicator(current, total) {
        this.els.pageIndicator.textContent = `${current} / ${total}`;
    }

    updateProgress(percentage) {
        this.els.progressBar.style.width = `${percentage}%`;
    }

    setPlayState(isPlaying) {
        const icon = this.els.btnPlayPause.querySelector('i');
        if (isPlaying) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    }

    populateVoices(voices) {
        this.els.voiceSelect.innerHTML = '';
        if (voices.length === 0) {
            this.els.voiceSelect.innerHTML = '<option value="">No English Voices Found</option>';
            return;
        }
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.default || voice.name.includes('Google US English')) {
                option.selected = true;
            }
            this.els.voiceSelect.appendChild(option);
        });
    }

    getSelectedVoice() {
        return this.els.voiceSelect.value;
    }

    getSelectedSpeed() {
        return parseFloat(this.els.speedSelect.value);
    }
}
