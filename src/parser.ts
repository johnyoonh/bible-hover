import { BOOK_ALIASES } from './bookAliases';

export interface BibleVerse {
    verse: number;
    text: string;
    line: number; // 0-indexed line number in source file
}

export interface BibleChapter {
    number: number;
    verses: Map<number, BibleVerse>;
}

export interface BibleBook {
    name: string;
    chapters: Map<number, BibleChapter>;
}

interface VerseSegment {
    startChapter: number;
    start: number;
    endChapter: number;
    end: number;
}

export type VerseDisplayMode = 'single' | 'full';

export class BibleParser {
    books: Map<string, BibleBook> = new Map();

    constructor(markdownContent: string) {
        this.parse(markdownContent);
    }

    private parse(content: string) {
        const lines = content.split('\n');
        let currentBook: BibleBook | null = null;
        let currentChapter: BibleChapter | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;
            const bookMatch = line.match(/^# (.+)/);
            if (bookMatch && bookMatch[1]) {
                const bookName = bookMatch[1].trim();
                // Store using Lowercase Key
                const key = bookName.toLowerCase();

                currentBook = { name: bookName, chapters: new Map() };
                this.books.set(key, currentBook);
                currentChapter = null;
                continue;
            }

            const chapterMatch = line.match(/^## Chapter (\d+)/);
            if (chapterMatch && chapterMatch[1] && currentBook) {
                const chapterNum = parseInt(chapterMatch[1]);
                currentChapter = { number: chapterNum, verses: new Map() };
                currentBook.chapters.set(chapterNum, currentChapter);
                continue;
            }

            const verseMatch = line.match(/^(\d+)\. (.+)/);
            if (verseMatch && verseMatch[1] && verseMatch[2] && currentChapter) {
                const verseNum = parseInt(verseMatch[1]);
                const verseText = verseMatch[2].trim();
                currentChapter.verses.set(verseNum, {
                    verse: verseNum,
                    text: verseText,
                    line: i
                });
            }
        }
    }

    public getVerses(refString: string, displayMode: VerseDisplayMode = 'full'): string | null {
        const parts = this.parseRef(refString);
        if (!parts) return null;

        const { bookName } = parts;
        const verseSegments = displayMode === 'single'
            ? this.getSingleVerseSegments(parts.verseSegments)
            : parts.verseSegments;

        // Resolve Alias (Case Insensitive)
        // Strip trailing dot if present (e.g., "Gen." -> "gen")
        let searchKey = bookName.toLowerCase().replace(/\.$/, '');

        // Check alias map
        if (BOOK_ALIASES.has(searchKey)) {
            // Get proper name, but we store in map by lowercase key of the proper name
            const properName = BOOK_ALIASES.get(searchKey)!;
            searchKey = properName.toLowerCase();
        }

        const book = this.books.get(searchKey);
        if (!book) return null;

        let outputSegments: string[] = [];

        for (const segment of verseSegments) {
            let segmentText = "";
            const isCrossChapter = segment.startChapter !== segment.endChapter;

            for (let chapterNum = segment.startChapter; chapterNum <= segment.endChapter; chapterNum++) {
                const chapter = book.chapters.get(chapterNum);
                if (!chapter) continue;

                const firstVerse = chapterNum === segment.startChapter ? segment.start : 1;
                const lastVerse = chapterNum === segment.endChapter
                    ? segment.end
                    : Math.max(...chapter.verses.keys());

                for (let i = firstVerse; i <= lastVerse; i++) {
                    const verseData = chapter.verses.get(i);
                    if (verseData) {
                        const label = isCrossChapter ? `${chapterNum}:${i}` : `${i}`;
                        segmentText += `<sup>${label}</sup> ${verseData.text} `;
                    }
                }
            }

            if (segmentText) {
                outputSegments.push(segmentText.trim());
            }
        }

        if (outputSegments.length === 0) return null;

        // Join segments with a horizontal rule
        return outputSegments.join('\n\n---\n\n');
    }

    private getSingleVerseSegments(verseSegments: VerseSegment[]): VerseSegment[] {
        const firstSegment = verseSegments[0];
        if (!firstSegment) return [];

        return [{
            startChapter: firstSegment.startChapter,
            start: firstSegment.start,
            endChapter: firstSegment.startChapter,
            end: firstSegment.start
        }];
    }

    public getVerseLine(refString: string): number | null {
        const parts = this.parseRef(refString);
        if (!parts) return null;

        const { bookName, verseSegments } = parts;
        if (verseSegments.length === 0 || !verseSegments[0]) return null;
        
        const firstChapter = verseSegments[0].startChapter;
        const firstVerse = verseSegments[0].start;

        let searchKey = bookName.toLowerCase().replace(/\.$/, '');
        if (BOOK_ALIASES.has(searchKey)) {
            const properName = BOOK_ALIASES.get(searchKey)!;
            searchKey = properName.toLowerCase();
        }

        const book = this.books.get(searchKey);
        if (!book) return null;

        const chapter = book.chapters.get(firstChapter);
        if (!chapter) return null;

        const verseData = chapter.verses.get(firstVerse);
        if (!verseData) return null;

        return verseData.line;
    }

    private parseRef(refString: string) {
        const cleanRef = refString
            .replace(/\[\[|\]\]/g, '')
            .replace(/[ \t]*[-–—][ \t]*$/g, '')
            .trim();
        // Capture book, chapter, and the rest of the string containing verses
        const mainMatch = cleanRef.match(/^(.+?)[ \t]+(\d+):(\d+(?::\d+)?(?:[ \t]*[-–—][ \t]*(?:\d+:)?\d+)?(?:[ \t]*,[ \t]*\d+(?::\d+)?(?:[ \t]*[-–—][ \t]*(?:\d+:)?\d+)?)*)$/);

        if (!mainMatch || !mainMatch[1] || !mainMatch[2] || !mainMatch[3]) return null;

        const bookName = mainMatch[1].trim();
        const chapterNum = parseInt(mainMatch[2]);
        const verseStr = mainMatch[3];

        // Parse comma separated segments:
        // "3-4,7-10" -> same-chapter ranges
        // "22-6:1" -> cross-chapter range from current chapter to chapter 6
        const segments = verseStr.split(',').map(s => {
            const rangeMatch = s.trim().match(/^(\d+)(?::(\d+))?(?:[ \t]*[-–—][ \t]*(?:(\d+):)?(\d+))?$/);
            if (!rangeMatch || !rangeMatch[1]) return null;
            const first = parseInt(rangeMatch[1]);
            const explicitStartVerse = rangeMatch[2] ? parseInt(rangeMatch[2]) : null;
            const explicitEndChapter = rangeMatch[3] ? parseInt(rangeMatch[3]) : null;
            const explicitEndVerse = rangeMatch[4] ? parseInt(rangeMatch[4]) : null;

            const startChapter = explicitStartVerse === null ? chapterNum : first;
            const start = explicitStartVerse === null ? first : explicitStartVerse;
            const endChapter = explicitEndChapter ?? startChapter;
            const end = explicitEndVerse ?? start;

            return { startChapter, start, endChapter, end };
        }).filter((s): s is VerseSegment => s !== null);

        return {
            bookName,
            chapterNum,
            verseSegments: segments
        };
    }
}
