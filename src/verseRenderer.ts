import type { RenderedVerseSegment } from "./parser";

export function renderVerseSegments(container: HTMLElement, segments: RenderedVerseSegment[]): void {
    container.empty();

    segments.forEach((segment, segmentIndex) => {
        if (segmentIndex > 0) {
            container.createDiv({ cls: "bible-verse-segment-separator" });
        }

        const segmentEl = container.createSpan({ cls: "bible-verse-segment" });

        segment.verses.forEach((verse, verseIndex) => {
            if (verseIndex > 0) {
                segmentEl.appendChild(document.createTextNode(" "));
            }

            const labelEl = segmentEl.createEl("sup", { text: verse.label });
            labelEl.addClass("bible-verse-label");
            segmentEl.appendChild(document.createTextNode(` ${verse.text}`));
        });
    });
}
