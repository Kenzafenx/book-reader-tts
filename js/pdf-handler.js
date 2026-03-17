export class PDFHandler {
    constructor() {
        this.pdfDocument = null;
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    async load(arrayBuffer) {
        const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        this.pdfDocument = await loadingTask.promise;

        let title = 'PDF Document';
        try {
            const metadata = await this.pdfDocument.getMetadata();
            if (metadata && metadata.info && metadata.info.Title) {
                if (metadata.info.Title.trim().length > 0) {
                    title = metadata.info.Title;
                }
            }
        } catch (e) {
            console.warn("Could not read PDF metadata.", e);
        }

        return {
            title: title,
            numSections: this.pdfDocument.numPages,
            sections: []
        };
    }

    async getPageText(pageNum) {
        if (!this.pdfDocument) return [];
        const page = await this.pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        let paragraphs = [];
        let currentPara = [];
        let lastY = null;

        for (let item of textContent.items) {
            const currentY = item.transform[5];
            if (lastY !== null && Math.abs(currentY - lastY) > 12) {
                if (currentPara.length > 0) {
                    paragraphs.push(currentPara.join(' '));
                    currentPara = [];
                }
            }
            currentPara.push(item.str.trim());
            lastY = currentY;
        }

        if (currentPara.length > 0) {
            paragraphs.push(currentPara.join(' '));
        }

        return paragraphs
            .map(p => p.replace(/\s+/g, ' ').trim())
            .filter(p => p.length > 0);
    }
}
