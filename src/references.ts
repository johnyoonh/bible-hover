import { isBibleRef, isValidBook } from "./bookAliases";

const SPACE = "[ \\t]";
const BOOK = `(?:[1-3]${SPACE}+|[IVX]+${SPACE}+)?[\\p{L}]+(?:${SPACE}+[\\p{L}]+)*\\.?`;
const VERSE_PART = `\\d+(?::\\d+)?(?:${SPACE}*[-–—]${SPACE}*(?:\\d+:)?\\d+)?(?:${SPACE}*,${SPACE}*\\d+(?::\\d+)?(?:${SPACE}*[-–—]${SPACE}*(?:\\d+:)?\\d+)?)*`;

export const FULL_REF_REGEX = new RegExp(
    `(((${BOOK})${SPACE}+\\d+:${VERSE_PART}))`,
    "gu",
);

export const WRAPPED_REF_REGEX = new RegExp(
    `\\[\\[(((${BOOK})${SPACE}+\\d+:${VERSE_PART}))\\]\\]|(((${BOOK})${SPACE}+\\d+:${VERSE_PART}))`,
    "gu",
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
