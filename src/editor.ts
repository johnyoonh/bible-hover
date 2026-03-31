import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { isValidBook } from "./bookAliases";

// Match both [[Gen 1:1]] and Gen 1:1
// Supports Unicode (Korean), Roman Numerals, Arabic prefix numbers, ranges, and commas
// Capture Group 1: Inner text if wrapped (e.g., Gen 1:1-2,5)
// Capture Group 2: Book name if wrapped (e.g., Gen)
// Capture Group 3: Full text if NOT wrapped (e.g., Gen 1:1-2,5)
// Capture Group 4: Book name if NOT wrapped (e.g., Gen)
const BIBLE_REF_REGEX = /\[\[((.+?)\s+\d+:[\d\s,–—-]+?)\]\]|((([1-3]\s|[IVX]+\s)?[\p{L}\s]+?\.?)\s+\d+:[\d\s,–—-]+)/gu;

export const bibleObserver = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();

            for (const { from, to } of view.visibleRanges) {
                const text = view.state.doc.sliceString(from, to);
                let match;

                // Reset regex
                BIBLE_REF_REGEX.lastIndex = 0;

                while ((match = BIBLE_REF_REGEX.exec(text)) !== null) {
                    const isWrapped = !!match[1];
                    const innerText = isWrapped ? match[1] : match[3];
                    const bookName = isWrapped ? match[2] : match[4];

                    if (bookName && isValidBook(bookName) && innerText) {
                        const start = from + match.index + (isWrapped ? 2 : 0);
                        const end = start + innerText.length;

                        // Add mark decoration
                        builder.add(
                            start,
                            end,
                            Decoration.mark({
                                class: "bible-link"
                            })
                        );
                    }
                }
            }

            return builder.finish();
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);
