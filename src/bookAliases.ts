// Book name aliases and abbreviations for Bible references
export const BOOK_ALIASES: Map<string, string> = new Map([
	["gen", "Genesis"],
	["exo", "Exodus"],
	["ex", "Exodus"],
	["lev", "Leviticus"],
	["num", "Numbers"],
	["deu", "Deuteronomy"],
	["josh", "Joshua"],
	["judg", "Judges"],
	["ruth", "Ruth"],
	["1 sam", "I Samuel"],
	["2 sam", "II Samuel"],
	["1 samuel", "I Samuel"],
	["2 samuel", "II Samuel"],
	["1 ki", "I Kings"],
	["2 ki", "II Kings"],
	["1 kings", "I Kings"],
	["2 kings", "II Kings"],
	["1 chron", "I Chronicles"],
	["2 chron", "II Chronicles"],
	["1 chronicles", "I Chronicles"],
	["2 chronicles", "II Chronicles"],
	["psa", "Psalms"],
	["psalm", "Psalms"],
	["1 cor", "I Corinthians"],
	["2 cor", "II Corinthians"],
	["1 corinthians", "I Corinthians"],
	["2 corinthians", "II Corinthians"],
	["1 thess", "I Thessalonians"],
	["2 thess", "II Thessalonians"],
	["1 thessalonians", "I Thessalonians"],
	["2 thessalonians", "II Thessalonians"],
	["1 tim", "I Timothy"],
	["2 tim", "II Timothy"],
	["1 timothy", "I Timothy"],
	["2 timothy", "II Timothy"],
	["1 pet", "I Peter"],
	["2 pet", "II Peter"],
	["1 peter", "I Peter"],
	["2 peter", "II Peter"],
	["1 john", "I John"],
	["2 john", "II John"],
	["3 john", "III John"],
	["1st john", "I John"],
	["2nd john", "II John"],
	["3rd john", "III John"],
	["rev", "Revelation of John"],
	["revelation", "Revelation of John"],
	]);

// Flatten all book aliases and full names into a Set for O(1) lookup
export const validBookNames: Set<string> = new Set(
	Array.from(BOOK_ALIASES.entries())
		.flat()
		.map((v) => v.toLowerCase()),
);

export function isValidBook(bookName: string): boolean {
    return validBookNames.has(bookName.toLowerCase().trim());
}

export function isBibleRef(text: string): boolean {
        // Match pattern: "Book Name chapter:verse"
        // Support optional range like "John 3:16-17" or "John 3:16-17"
        const match = text.match(/^(.+?)\s+(\d+):(\d+)(?:\s?[-–—]\s?\d+)?$/);
        if (!match || !match[1]) return false;

        return isValidBook(match[1])
}

