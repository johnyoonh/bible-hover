import { Plugin, MarkdownRenderer, TFile, Component } from 'obsidian';
import { BibleParser } from './parser';
import { DEFAULT_SETTINGS, BibleHoverSettings, BibleHoverSettingTab } from "./settings";
import { bibleObserver } from './editor';
import { isBibleRef, isValidBook } from './bookAliases';

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

        this.registerEditorExtension(bibleObserver);

        // Command to re-index all bibles
        this.addCommand({
            id: 'reindex-bibles',
            name: 'Re-index all bibles',
            callback: async () => {
                await this.loadBibleData();
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
                    await this.navigateToVerse(evt, ref);
                    return;
                }
            }
            this.handleLinkNotFound(evt);
        }, { capture: true });

        // Touch support for navigation (tap on link)
        this.registerDomEvent(document, 'touchend', async (evt: TouchEvent) => {
            const linkEl = this.getLinkElement(evt.target as HTMLElement);
            if (linkEl) {
                const ref = this.getRefFromLink(linkEl);
                if (ref) {
                    await this.navigateToVerse(evt, ref);
                    return;
                }
            }
            this.handleLinkNotFound(evt);
        }, { capture: true });

        this.registerMarkdownPostProcessor((element, context) => {
            const links = element.querySelectorAll('a.internal-link');
            links.forEach((link) => {
                const linkEl = link as HTMLAnchorElement;
                const href = linkEl.getAttribute('data-href');

                if (href && isBibleRef(href)) {
                    linkEl.addClass('bible-link');
                }
            });

            // Handle plain text references
            const WALKER = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
            let node;
            const nodesToReplace: { node: Text, matches: RegExpExecArray[] }[] = [];

            while (node = WALKER.nextNode()) {
                const textNode = node as Text;
                if (textNode.parentElement?.closest('a') || textNode.parentElement?.closest('code')) continue;

                const text = textNode.nodeValue || '';
                const BIBLE_REF_REGEX = /((([1-3]\s|[IVX]+\s)?[A-Za-z\s]+?\.?)\s+\d+:\d+(?:\s?[-–—]\s?\d+)?)/gi;
                let match;
                const matches: RegExpExecArray[] = [];

                while ((match = BIBLE_REF_REGEX.exec(text)) !== null) {
                    const bookMatch = match[2];
                    if (bookMatch && isValidBook(bookMatch)) {
                        matches.push(match);
                    }
                }

                if (matches.length > 0) {
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
                    span.setText(match[0]);
                    fragment.appendChild(span);
                    lastIndex = match.index + match[0].length;
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

    getCurrentParser(): BibleParser | null {
        if (!this.currentVersion) return null;
        return this.bibleParsers.get(this.currentVersion) || null;
    }

    private getLinkElement(target: HTMLElement): HTMLElement | null {
        return target.matches('.bible-link') ? target : target.closest('.bible-link');
    }

    private getRefFromLink(linkEl: HTMLElement): string | null {
        let ref = linkEl.getAttribute('data-href') ||  linkEl.textContent;
        if (!ref) return null;

        ref = ref.replace(/\[\[|\]\]/g, '');
        return isBibleRef(ref) ? ref : null;
    }

    private handleLinkNotFound(event: MouseEvent | TouchEvent): void {
        if (this.hoverPopover && !(event.target as HTMLElement).closest('.bible-hover-popover')) {
            this.onLinkLeave(event as MouseEvent);
        }
    }

    async onLinkHover(event: MouseEvent, ref: string, linkEl?: HTMLElement) {
        const parser = this.getCurrentParser();
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

    private async navigateToVerse(evt: MouseEvent | TouchEvent, ref: string): Promise<void> {
        const parser = this.getCurrentParser();
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
            // Check for modifiers (Ctrl/Cmd) on mouse events
            const isMouseEvent = evt instanceof MouseEvent;
            const newLeaf = isMouseEvent && (evt.ctrlKey || evt.metaKey);
            const leaf = this.app.workspace.getLeaf(newLeaf);
            await leaf.openFile(file, { eState: { line: line } });
        }
    }
}
