import { Plugin, MarkdownRenderer, TFile, Component, Notice } from 'obsidian';
import { BibleParser } from './parser';
import { DEFAULT_SETTINGS, BibleHoverSettings, BibleHoverSettingTab, VerseDisplayMode } from "./settings";
import { createBibleObserver } from './editor';
import { isBibleRef, isKorean } from './bookAliases';
import { bookNameFromReference, firstValidReference, FULL_REF_REGEX, normalizeReference, STANDALONE_REF_REGEX } from './references';

export default class BibleHoverPlugin extends Plugin {
    bibleParsers: Map<string, BibleParser> = new Map();
    currentVersion: string = '';
    hoverPopover: HTMLElement | null = null;
    hideTimeout: number | null = null;
    settings: BibleHoverSettings;
    LinkHoverComponent: Component | null

    async onload() {

        await this.loadSettings();
        this.applySettings();

        this.app.workspace.onLayoutReady(async () => {
            await this.loadBibleData();
        });

        this.addSettingTab(new BibleHoverSettingTab(this.app, this));

        this.registerEditorExtension(createBibleObserver(this));

        // Command to re-index all bibles
        this.addCommand({
            id: 'reindex-bibles',
            name: 'Re-index all bibles',
            callback: async () => {
                await this.loadBibleData();
            }
        });

        this.addCommand({
            id: 'show-full-reference',
            name: 'Display full Bible reference inline',
            callback: async () => {
                await this.setVerseDisplayMode('full');
            }
        });

        this.addCommand({
            id: 'show-single-verse',
            name: 'Display single Bible verse inline',
            callback: async () => {
                await this.setVerseDisplayMode('single');
            }
        });

        this.addCommand({
            id: 'hide-inline-verses',
            name: 'Hide inline Bible verses',
            callback: async () => {
                await this.setVerseDisplayMode('off');
            }
        });

        this.addCommand({
            id: 'toggle-verse-display',
            name: 'Toggle inline Bible verse display',
            callback: async () => {
                const nextMode = this.settings.verseDisplayMode === 'single' ? 'full' : 'single';
                await this.setVerseDisplayMode(nextMode);
            }
        });

        // Global Event Listener for Hover
        this.registerDomEvent(document, 'mouseover', (evt: MouseEvent) => {
            const linkEl = this.getLinkElement(evt.target as HTMLElement);
            if (linkEl) {
                const ref = this.getRefFromLink(linkEl);
                if (ref) {
                    void this.onLinkHover(evt, ref, linkEl);
                    return;
                }
            }
            this.handleLinkNotFound(evt);
        });

        // Touch support for hover popover
        this.registerDomEvent(document, 'touchstart', (evt: TouchEvent) => {
            const linkEl = this.getLinkElement(evt.target as HTMLElement);
            if (linkEl) {
                const ref = this.getRefFromLink(linkEl);
                if (ref) {
                    const touch = evt.touches[0];
                    void this.onLinkHover(touch as unknown as MouseEvent, ref, linkEl);
                    return;
                }
            }
            this.handleLinkNotFound(evt);
        });

        // Global Event Listener for Click (Navigation)
        this.registerDomEvent(document, 'click', async (evt: MouseEvent) => {
            const linkEl = this.getLinkElement(evt.target as HTMLElement);
            if (linkEl) {
                const ref = this.getRefFromLink(linkEl);
                if (ref) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (evt.metaKey) {
                        await this.navigateToVerse(evt, ref);
                    }
                    return;
                }
            }
            this.handleLinkNotFound(evt);
        }, { capture: true });

        this.registerMarkdownPostProcessor((element, context) => {
            const links = element.querySelectorAll('a.internal-link');
            links.forEach((link) => {
                const linkEl = link as HTMLAnchorElement;
                const href = normalizeReference(linkEl.getAttribute('data-href') ?? "");

                if (href && isBibleRef(href)) {
                    linkEl.addClass('bible-link');
                    linkEl.setAttribute('data-href', href);
                    const inlineVerseEl = this.createInlineVerseElement(href);
                    if (inlineVerseEl) {
                        linkEl.insertAdjacentElement('afterend', inlineVerseEl);
                    }
                }
            });

            // Handle plain text references and standalone chapter:verse
            const WALKER = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
            const nodesToReplace: { node: Text, matches: { full: string, book?: string, text: string, index: number }[] }[] = [];
            let lastBook: string | undefined;

            while (true) {
                const node = WALKER.nextNode();
                if (!node) break;

                const textNode = node as Text;
                if (textNode.parentElement?.closest('a') || textNode.parentElement?.closest('code')) continue;

                const text = textNode.nodeValue || '';
                const matches: { full: string, book?: string, text: string, index: number }[] = [];

                // Track matches with their indices
                let fullMatch;
                FULL_REF_REGEX.lastIndex = 0;
                while ((fullMatch = FULL_REF_REGEX.exec(text)) !== null) {
                    const fullRef = normalizeReference(fullMatch[1] ?? "");
                    const bookMatch = bookNameFromReference(fullRef);
                    if (bookMatch && isBibleRef(fullRef)) {
                        lastBook = bookMatch;
                        matches.push({ full: fullRef, book: bookMatch, text: fullRef, index: fullMatch.index });
                    }
                }

                if (lastBook) {
                    let standaloneMatch;
                    STANDALONE_REF_REGEX.lastIndex = 0;
                    while ((standaloneMatch = STANDALONE_REF_REGEX.exec(text)) !== null) {
                        const standaloneRef = standaloneMatch[1];
                        if (!standaloneRef) continue;
                        const standaloneIndex = standaloneMatch.index;
                        // Avoid overlapping with full matches
                        if (!matches.some(m => standaloneIndex >= m.index && standaloneIndex < m.index + m.full.length)) {
                            matches.push({ 
                                full: `${lastBook} ${standaloneRef}`, 
                                text: standaloneRef, 
                                index: standaloneIndex 
                            });
                        }
                    }
                }

                if (matches.length > 0) {
                    // Sort matches by index
                    matches.sort((a, b) => a.index - b.index);
                    nodesToReplace.push({ node: textNode, matches });
                }
            }

            for (const { node, matches } of nodesToReplace) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                const text = node.nodeValue || '';

                for (const match of matches) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                    const span = document.createElement('span');
                    span.addClass('bible-link');
                    span.setAttribute('data-href', match.full); // Store the full reference including inferred book
                    span.setText(match.text);
                    fragment.appendChild(span);
                    const inlineVerseEl = this.createInlineVerseElement(match.full);
                    if (inlineVerseEl) {
                        fragment.appendChild(inlineVerseEl);
                    }
                    lastIndex = match.index + match.text.length;
                }
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                node.replaceWith(fragment);
            }
        });
    }

    onunload() {
        if (this.hoverPopover) {
            this.hoverPopover.remove();
        }
    }

    async loadSettings() {
        const loadedData = await this.loadData() as Partial<BibleHoverSettings>;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private async setVerseDisplayMode(mode: VerseDisplayMode): Promise<void> {
        this.settings.verseDisplayMode = mode;
        await this.saveSettings();
        this.refreshInlineVerseDisplay();

        const modeLabel = mode === 'off'
            ? 'hiding inline verses'
            : mode === 'full'
                ? 'displaying full references inline'
                : 'displaying single verses inline';
        new Notice(`Bible Hover: ${modeLabel}`);
    }

    refreshInlineVerseDisplay(): void {
        this.app.workspace.updateOptions();
    }

    async loadBibleData() {
        try {
            const adapter = this.app.vault.adapter;
            this.bibleParsers.clear();

            if (this.settings.bibles.length === 0) {
                console.error('No Bibles configured');
                return;
            }

            // Load all configured Bibles
            for (const bible of this.settings.bibles) {
                let path = bible.path;

                // Ensure usage of correct path if user didn't provide extension
                if (!path.endsWith('.md')) path += '.md';

                if (!(await adapter.exists(path))) {
                    console.error(`Bible file not found at ${path}`);
                    continue;
                }

                const content = await adapter.read(path);
                this.bibleParsers.set(bible.name, new BibleParser(content));
            }

            // Set current version to default or first available
            if (this.settings.defaultBible && this.bibleParsers.has(this.settings.defaultBible)) {
                this.currentVersion = this.settings.defaultBible;
            } else if (this.bibleParsers.size > 0) {
                const firstVersion = Array.from(this.bibleParsers.keys())[0];
                if (firstVersion)
                    this.currentVersion = firstVersion;
            }
        } catch (e) {
            console.error('Error loading bible data', e);
        }
    }

    applySettings() {
        // Use setCssProps on the body to change link colors dynamically
        document.body.style.setProperty('--bible-link-color', this.settings.linkColor);
    }

    getCurrentParser(ref?: string): BibleParser | null {
        if (ref) {
            const parts = ref.match(/^(.+?)\s+/);
            if (parts && parts[1] && isKorean(parts[1])) {
                if (this.bibleParsers.has("KRV")) return this.bibleParsers.get("KRV")!;
            }
        }
        if (!this.currentVersion) return null;
        return this.bibleParsers.get(this.currentVersion) || null;
    }

    private getLinkElement(target: HTMLElement): HTMLElement | null {
        const directLink = target.matches('.bible-link') ? target : target.closest('.bible-link');
        if (directLink) return directLink as HTMLElement;

        const line = target.closest<HTMLElement>('.cm-line');
        if (line && firstValidReference(line.textContent ?? "")) {
            return line;
        }

        return null;
    }

    private getRefFromLink(linkEl: HTMLElement): string | null {
        let ref = normalizeReference(linkEl.getAttribute('data-href') ||  linkEl.textContent || "");
        if (!ref) return null;

        if (isBibleRef(ref)) return ref;

        const line = linkEl.closest<HTMLElement>('.cm-line');
        if (line) {
            return firstValidReference(line.textContent ?? "");
        }

        return firstValidReference(ref);
    }

    private handleLinkNotFound(event: MouseEvent | TouchEvent): void {
        if (this.hoverPopover && !(event.target as HTMLElement).closest('.bible-hover-popover')) {
            this.onLinkLeave(event as MouseEvent);
        }
    }

    async onLinkHover(event: MouseEvent, ref: string, linkEl?: HTMLElement) {
        const parser = this.getCurrentParser(ref);
        if (!parser) return;
        const text = parser.getVerses(ref);

        if (this.hoverPopover) this.hoverPopover.remove();

        this.hoverPopover = document.createElement('div');
        this.hoverPopover.addClass('bible-hover-popover');

        const renderContent = async (textToRender: string | null, contentDiv: HTMLElement) => {
            contentDiv.empty();
            const content = textToRender || 'Not found';

            let componentEl = this.LinkHoverComponent ?? new Component();
            if (!componentEl) {
                return;
            }

            await MarkdownRenderer.render(this.app, content, contentDiv, '', componentEl);
        };

        const contentDiv = this.hoverPopover.createDiv({ cls: 'bible-popover-content' });
        await renderContent(text, contentDiv);

        // Keep popover visible when mouse is over it
        this.hoverPopover.addEventListener('mouseenter', () => {
            // Clear the hide timeout when entering popover
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
            if (this.hoverPopover) {
                this.hoverPopover.dataset.hovering = 'true';
            }
        });

        this.hoverPopover.addEventListener('mouseleave', () => {
            if (this.hoverPopover) {
                this.hoverPopover.dataset.hovering = 'false';
                this.hoverPopover.remove();
                this.hoverPopover = null;
            }
        });

        document.body.appendChild(this.hoverPopover);

        // Calculate position after adding to body
        const rect = this.hoverPopover.getBoundingClientRect();
        const hoverWidth = rect.width || 400;
        const hoverHeight = rect.height || 500;

        let top = event.clientY + 15;
        let left = event.clientX + 15;

        // Ensure it doesn't go beyond right edge
        if (left + hoverWidth > window.innerWidth) {
            left = window.innerWidth - hoverWidth - 20;
        }

        // Ensure it doesn't go beyond bottom edge
        if (top + hoverHeight > window.innerHeight) {
            // Flip to show above the mouse
            top = event.clientY - hoverHeight - 15;
        }

        // Ensure it doesn't go beyond top or left edges
        if (left < 10) left = 10;
        if (top < 10) top = 10;

        this.hoverPopover.style.top = top + 'px';
        this.hoverPopover.style.left = left + 'px';
    }

    private createInlineVerseElement(ref: string): HTMLElement | null {
        if (this.settings.verseDisplayMode === 'off') return null;

        const parser = this.getCurrentParser(ref);
        const text = parser?.getVerses(ref, this.settings.verseDisplayMode);
        if (!text) return null;

        const inlineVerseEl = document.createElement('span');
        inlineVerseEl.addClass('bible-inline-verse');
        inlineVerseEl.innerHTML = text;
        return inlineVerseEl;
    }

    onLinkLeave(event: MouseEvent) {
        // Clear any existing timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        // Add delay before hiding (300ms)
        this.hideTimeout = window.setTimeout(() => {
            // Don't remove if mouse is over the popover
            if (this.hoverPopover && this.hoverPopover.dataset.hovering !== 'true') {
                this.hoverPopover.remove();
                this.hoverPopover = null;
            }
        }, 300) as unknown as number;
    }

    private async navigateToVerse(evt: MouseEvent, ref: string): Promise<void> {
        const parser = this.getCurrentParser(ref);
        if (!parser) return;

        evt.preventDefault();
        evt.stopPropagation();

        const line = parser.getVerseLine(ref);
        if (line === null) return;

        // Get path for current version
        const currentBible = this.settings.bibles.find(b => b.name === this.currentVersion);
        if (!currentBible) return;

        const path = currentBible.path;
        const file = this.app.vault.getAbstractFileByPath(path);

        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(file, { eState: { line: line } });
        }
    }
}
