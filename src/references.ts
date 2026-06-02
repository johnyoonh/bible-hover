import { isBibleRef, isValidBook, validBookNames } from "./bookAliases";

const SPACE = "[ \\t]";
const VERSE_SEGMENT = `\\d+(?::\\d+)?(?:${SPACE}*[-–—]${SPACE}*(?:\\d+:)?\\d+)?`;
const NUMBERED_BOOK_REF_AFTER_COMMA = `[1-3]${SPACE}+[\\p{L}]+(?:${SPACE}+[\\p{L}]+)*${SPACE}+\\d+:`;
const VERSE_PART = `${VERSE_SEGMENT}(?:${SPACE}*,${SPACE}*(?!${NUMBERED_BOOK_REF_AFTER_COMMA})${VERSE_SEGMENT})*`;
const BOOK_BOUNDARY = "(?<![\\p{L}\\d])";

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasToRegex(alias: string): string {
    return alias
        .trim()
        .split(/[ \t]+/)
        .map(escapeRegex)
        .join(`${SPACE}+`) + "\\.?";
}

const BOOK = Array.from(validBookNames)
    .sort((a, b) => b.length - a.length)
    .map(aliasToRegex)
    .join("|");

export const FULL_REF_REGEX = new RegExp(
    `${BOOK_BOUNDARY}(((${BOOK})${SPACE}+\\d+:${VERSE_PART}))`,
    "giu",
);

export const WRAPPED_REF_REGEX = new RegExp(
    `\\[\\[(((${BOOK})${SPACE}+\\d+:${VERSE_PART}))\\]\\]|${BOOK_BOUNDARY}(((${BOOK})${SPACE}+\\d+:${VERSE_PART}))`,
    "giu",
);

export const STANDALONE_REF_REGEX = new RegExp(
    `(?<![:\\d])(\\d+:${VERSE_PART})(?![-–—\\d:])`,
    "gu",
);

export function normalizeReference(ref: string): string {
    return ref
        .replace(/\[\[|\]\]/g, "")
        .replace(/[ \t]*[-–—][ \t]*$/g, "")
        .trim();
}

export function firstValidReference(text: string): string | null {
    FULL_REF_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = FULL_REF_REGEX.exec(text)) !== null) {
        const ref = normalizeReference(match[1] ?? "");
        const bookName = match[3];

        if (bookName && isValidBook(bookName) && isBibleRef(ref)) {
            return ref;
        }
    }

    return null;
}

export function bookNameFromReference(ref: string): string | null {
    const match = normalizeReference(ref).match(/^(.+?)[ \t]+\d+:/u);
    const bookName = match?.[1]?.trim();
    return bookName && isValidBook(bookName) ? bookName : null;
}
