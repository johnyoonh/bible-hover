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

    public getVerses(refString: string): string | null {
        const parts = this.parseRef(refString);
        if (!parts) return null;

        const { bookName, chapterNum, verseSegments } = parts;

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

        const chapter = book.chapters.get(chapterNum);
        if (!chapter) return null;

        let outputSegments: string[] = [];

        for (const segment of verseSegments) {
            let segmentText = "";
            for (let i = segment.start; i <= segment.end; i++) {
                const verseData = chapter.verses.get(i);
                if (verseData) {
                    segmentText += `<sup>${i}</sup> ${verseData.text} `;
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

    public getVerseLine(refString: string): number | null {
        const parts = this.parseRef(refString);
        if (!parts) return null;

        const { bookName, chapterNum, verseSegments } = parts;
        if (verseSegments.length === 0 || !verseSegments[0]) return null;
        
        const firstVerse = verseSegments[0].start;

        let searchKey = bookName.toLowerCase().replace(/\.$/, '');
        if (BOOK_ALIASES.has(searchKey)) {
            const properName = BOOK_ALIASES.get(searchKey)!;
            searchKey = properName.toLowerCase();
        }

        const book = this.books.get(searchKey);
        if (!book) return null;

        const chapter = book.chapters.get(chapterNum);
        if (!chapter) return null;

        const verseData = chapter.verses.get(firstVerse);
        if (!verseData) return null;

        return verseData.line;
    }

    private parseRef(refString: string) {
        const cleanRef = refString.replace(/\[\[|\]\]/g, '').trim();
        // Capture book, chapter, and the rest of the string containing verses
        const mainMatch = cleanRef.match(/^(.+?)\s+(\d+):([\d\s,–—-]+)$/);

        if (!mainMatch || !mainMatch[1] || !mainMatch[2] || !mainMatch[3]) return null;

        const bookName = mainMatch[1].trim();
        const chapterNum = parseInt(mainMatch[2]);
        const verseStr = mainMatch[3];

        // Parse comma separated segments: "3-4,7-10" -> [{start:3, end:4}, {start:7, end:10}]
        const segments = verseStr.split(',').map(s => {
            const rangeMatch = s.trim().match(/(\d+)(?:\s?[-–—]\s?(\d+))?/);
            if (!rangeMatch || !rangeMatch[1]) return null;
            const start = parseInt(rangeMatch[1]);
            const end = rangeMatch[2] ? parseInt(rangeMatch[2]) : start;
            return { start, end };
        }).filter((s): s is {start: number, end: number} => s !== null);

        return {
            bookName,
            chapterNum,
            verseSegments: segments
        };
    }
}
