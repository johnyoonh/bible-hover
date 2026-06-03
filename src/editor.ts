import {
    Decoration,
    DecorationSet,
    EditorView,
    WidgetType,
    ViewPlugin,
    ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { bookNameFromReference, firstValidReference, FULL_REF_REGEX, normalizeReference, STANDALONE_REF_REGEX, WRAPPED_REF_REGEX } from "./references";
import { isBibleRef } from "./bookAliases";
import type BibleHoverPlugin from "./main";
import type { RenderedVerseSegment } from "./parser";
import { renderVerseSegments } from "./verseRenderer";

interface BibleReferenceMatch {
    start: number;
    end: number;
    insertAt: number;
    full: string;
}

class InlineVerseWidget extends WidgetType {
    constructor(private segments: RenderedVerseSegment[]) {
        super();
    }

    eq(other: InlineVerseWidget): boolean {
        return JSON.stringify(other.segments) === JSON.stringify(this.segments);
    }

    toDOM(): HTMLElement {
        const container = document.createElement("span");
        container.addClass("bible-inline-verse");
        renderVerseSegments(container, this.segments);
        return container;
    }
}

export function createBibleObserver(plugin: BibleHoverPlugin) {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged || update.selectionSet) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            const fullText = view.state.doc.toString();

            for (const { from, to } of view.visibleRanges) {
                const visibleText = view.state.doc.sliceString(from, to);
                
                let match;
                const matches: BibleReferenceMatch[] = [];

                WRAPPED_REF_REGEX.lastIndex = 0;
                while ((match = WRAPPED_REF_REGEX.exec(visibleText)) !== null) {
                    const isWrapped = match[0].startsWith("[[");
                    const rawText = isWrapped ? match[0].slice(2, -2) : match[0];
                    const innerText = normalizeReference(rawText);

                    if (innerText && isBibleRef(innerText)) {
                        const start = from + match.index + (isWrapped ? 2 : 0);
                        const end = start + innerText.length;
                        const rawEnd = from + match.index + match[0].length;
                        matches.push({
                            start,
                            end,
                            insertAt: this.getInlineInsertPosition(fullText, rawEnd),
                            full: innerText
                        });
                    }
                }

                // Standalone references
                STANDALONE_REF_REGEX.lastIndex = 0;
                while ((match = STANDALONE_REF_REGEX.exec(visibleText)) !== null) {
                    const start = from + match.index;
                    const standaloneRef = match[1];
                    if (!standaloneRef) continue;
                    const end = start + standaloneRef.length;

                    // Avoid overlapping
                    if (matches.some(m => start >= m.start && start < m.end)) continue;

                    // Infer book by scanning backwards in the full document
                    const textBefore = fullText.slice(0, start);
                    const bookMatch = Array.from(textBefore.matchAll(FULL_REF_REGEX)).pop();
                    const previousRef = bookMatch ? firstValidReference(bookMatch[0]) : null;
                    const bookName = previousRef ? bookNameFromReference(previousRef) : null;
                    
                    if (bookName) {
                        matches.push({
                            start,
                            end,
                            insertAt: this.getInlineInsertPosition(fullText, end),
                            full: `${bookName} ${standaloneRef}`
                        });
                    }
                }

                // Add decorations
                matches.sort((a, b) => a.start - b.start);
                for (const m of matches) {
                    const parser = plugin.getCurrentParser(m.full);
                    const inlineSegments = plugin.settings.verseDisplayMode === 'off'
                        ? null
                        : parser?.getVerseSegments(m.full, plugin.settings.verseDisplayMode);

                    builder.add(
                        m.start,
                        m.end,
                        Decoration.mark({
                            class: "bible-link",
                            attributes: { "data-href": m.full }
                        })
                    );

                    if (inlineSegments) {
                        builder.add(
                            m.insertAt,
                            m.insertAt,
                            Decoration.widget({
                                widget: new InlineVerseWidget(inlineSegments),
                                side: 1
                            })
                        );
                    }
                }
            }

            return builder.finish();
        }

        private getInlineInsertPosition(text: string, end: number): number {
            return text[end] === ":" ? end + 1 : end;
        }
    }, {
        decorations: (v) => v.decorations,
    });
}
