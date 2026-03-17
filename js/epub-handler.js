export class EPUBHandler {
    constructor() {
        this.zip = null;
        this.spine = [];
        this.basePath = '';
    }

    async load(arrayBuffer) {
        this.zip = await window.JSZip.loadAsync(arrayBuffer);
        const containerData = await this.zip.file("META-INF/container.xml").async("text");
        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerData, "text/xml");
        const rootfiles = containerDoc.getElementsByTagName("rootfile");
        if (rootfiles.length === 0) throw new Error("Invalid EPUB: No rootfile found.");
        const opfPath = rootfiles[0].getAttribute("full-path");
        this.basePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

        const opfData = await this.zip.file(opfPath).async("text");
        const opfDoc = parser.parseFromString(opfData, "text/xml");

        const titleNodes = opfDoc.getElementsByTagName("dc:title");
        const titleNodesAlt = opfDoc.getElementsByTagName("title");
        let title = "Unknown EPUB";
        if (titleNodes.length > 0) title = titleNodes[0].textContent;
        else if (titleNodesAlt.length > 0) title = titleNodesAlt[0].textContent;

        const manifestItems = {};
        let ncxPath = null;
        const items = opfDoc.getElementsByTagName("item");
        for (let i = 0; i < items.length; i++) {
            const id = items[i].getAttribute("id");
            const href = items[i].getAttribute("href");
            const mediaType = items[i].getAttribute("media-type");
            manifestItems[id] = href;
            if (mediaType === "application/x-dtbncx+xml" || id === "ncx") {
                ncxPath = href;
            }
        }

        const tocMap = {};
        if (ncxPath) {
            try {
                const ncxFullPath = this.basePath + ncxPath;
                const ncxData = await this.zip.file(ncxFullPath).async("text");
                const ncxDoc = parser.parseFromString(ncxData, "text/xml");
                const navPoints = ncxDoc.getElementsByTagName("navPoint");
                for (let i = 0; i < navPoints.length; i++) {
                    const textNode = navPoints[i].getElementsByTagName("text")[0];
                    const contentNode = navPoints[i].getElementsByTagName("content")[0];
                    if (textNode && contentNode) {
                        let src = contentNode.getAttribute("src");
                        src = src.split('#')[0];
                        tocMap[src] = textNode.textContent.trim();
                    }
                }
            } catch (e) {
                console.warn("Failed to parse NCX for TOC", e);
            }
        }

        this.spine = [];
        const itemrefs = opfDoc.getElementsByTagName("itemref");
        for (let i = 0; i < itemrefs.length; i++) {
            const idref = itemrefs[i].getAttribute("idref");
            if (manifestItems[idref]) {
                this.spine.push(manifestItems[idref]);
            }
        }

        const sections = this.spine.map((href, index) => {
            const cleanHref = href.split('#')[0];
            return { title: tocMap[cleanHref] || `Section ${index + 1}`, href: href };
        });

        return { title: title, numSections: this.spine.length, sections: sections };
    }

    async getPageText(chapterIndex) {
        const href = this.spine[chapterIndex - 1];
        if (!href) return [];
        const fullPath = this.basePath + href;
        const file = this.zip.file(fullPath);
        if (!file) return [];
        const htmlData = await file.async("text");
        const parser = new DOMParser();
        let doc;
        try {
            doc = parser.parseFromString(htmlData, "application/xhtml+xml");
            if (doc.querySelector("parsererror")) throw new Error("XHTML parsing error");
        } catch (e) {
            doc = parser.parseFromString(htmlData, "text/html");
        }

        const paragraphs = [];
        const nodes = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div');
        if (nodes.length > 0) {
            nodes.forEach(node => {
                if (node.tagName.toLowerCase() === 'div') {
                    const hasBlockChildren = node.querySelector('p, h1, h2, h3, h4, h5, h6, li, div');
                    if (hasBlockChildren) return;
                }
                const text = node.textContent.replace(/\s+/g, ' ').trim();
                if (text.length > 0) {
                    paragraphs.push(text);
                }
            });
        } else {
            const raw = doc.body.textContent.trim();
            if (raw.length > 0) {
                raw.split('\n').forEach(line => {
                    const t = line.trim();
                    if (t.length > 0) paragraphs.push(t);
                });
            }
        }
        return paragraphs;
    }
}
