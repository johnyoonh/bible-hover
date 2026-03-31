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

	// Korean (KRV) Aliases
	["창세기", "Genesis"], ["창", "Genesis"],
	["출애굽기", "Exodus"], ["출", "Exodus"],
	["레위기", "Leviticus"], ["레", "Leviticus"],
	["민수기", "Numbers"], ["민", "Numbers"],
	["신명기", "Deuteronomy"], ["신", "Deuteronomy"],
	["여호수아", "Joshua"], ["수", "Joshua"],
	["사사기", "Judges"], ["삿", "Judges"],
	["룻기", "Ruth"], ["룻", "Ruth"],
	["사무엘상", "I Samuel"], ["삼상", "I Samuel"],
	["사무엘하", "II Samuel"], ["삼하", "II Samuel"],
	["열왕기상", "I Kings"], ["왕상", "I Kings"],
	["열왕기하", "II Kings"], ["왕하", "II Kings"],
	["역대상", "I Chronicles"], ["대상", "I Chronicles"],
	["역대하", "II Chronicles"], ["대하", "II Chronicles"],
	["에스라", "Ezra"], ["스", "Ezra"],
	["느헤미야", "Nehemiah"], ["느", "Nehemiah"],
	["에스더", "Esther"], ["에", "Esther"],
	["욥기", "Job"], ["욥", "Job"],
	["시편", "Psalms"], ["시", "Psalms"],
	["잠언", "Proverbs"], ["잠", "Proverbs"],
	["전도서", "Ecclesiastes"], ["전", "Ecclesiastes"],
	["아가", "Song of Solomon"], ["아", "Song of Solomon"],
	["이사야", "Isaiah"], ["사", "Isaiah"],
	["예레미야", "Jeremiah"], ["렘", "Jeremiah"],
	["예레미야애가", "Lamentations"], ["애", "Lamentations"],
	["에스겔", "Ezekiel"], ["겔", "Ezekiel"],
	["다니엘", "Daniel"], ["단", "Daniel"],
	["호세아", "Hosea"], ["호", "Hosea"],
	["요엘", "Joel"], ["욜", "Joel"],
	["아모스", "Amos"], ["암", "Amos"],
	["오바댜", "Obadiah"], ["옵", "Obadiah"],
	["요나", "Jonah"], ["욘", "Jonah"],
	["미가", "Micah"], ["미", "Micah"],
	["나훔", "Nahum"], ["나", "Nahum"],
	["하박국", "Habakkuk"], ["합", "Habakkuk"],
	["스바냐", "Zephaniah"], ["습", "Zephaniah"],
	["학개", "Haggai"], ["학", "Haggai"],
	["스가랴", "Zechariah"], ["슥", "Zechariah"],
	["말라기", "Malachi"], ["말", "Malachi"],
	["마태복음", "Matthew"], ["마", "Matthew"],
	["마가복음", "Mark"], ["막", "Mark"],
	["누가복음", "Luke"], ["눅", "Luke"],
	["요한복음", "John"], ["요", "John"],
	["사도행전", "Acts"], ["행", "Acts"],
	["로마서", "Romans"], ["롬", "Romans"],
	["고린도전서", "I Corinthians"], ["고전", "I Corinthians"],
	["고린도후서", "II Corinthians"], ["고후", "II Corinthians"],
	["갈라디아서", "Galatians"], ["갈", "Galatians"],
	["에베소서", "Ephesians"], ["엡", "Ephesians"],
	["빌립보서", "Philippians"], ["빌", "Philippians"],
	["골로새서", "Colossians"], ["골", "Colossians"],
	["데살로니가전서", "I Thessalonians"], ["살전", "I Thessalonians"],
	["데살로니가후서", "II Thessalonians"], ["살후", "II Thessalonians"],
	["디모데전서", "I Timothy"], ["딤전", "I Timothy"],
	["디모데후서", "II Timothy"], ["딤후", "II Timothy"],
	["디도서", "Titus"], ["딛", "Titus"],
	["빌레몬서", "Philemon"], ["몬", "Philemon"],
	["히브리서", "Hebrews"], ["히", "Hebrews"],
	["야고보서", "James"], ["약", "James"],
	["베드로전서", "I Peter"], ["벧전", "I Peter"],
	["베드로후서", "II Peter"], ["벧후", "II Peter"],
	["요한1서", "I John"], ["요일", "I John"],
	["요한2서", "II John"], ["요이", "II John"],
	["요한3서", "III John"], ["요삼", "III John"],
	["유다서", "Jude"], ["유", "Jude"],
	["요한계시록", "Revelation of John"], ["계", "Revelation of John"],
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

export function isKorean(text: string): boolean {
    return /[\u3131-\uD79D]/.test(text);
}

export function isBibleRef(text: string): boolean {
        // Match pattern: "Book Name chapter:verse"
        // Support complex verse parts like "3:3,16" or "3:3-4,7-10"
        const match = text.match(/^(.+?)\s+(\d+):([\d\s,–—-]+)$/);
        if (!match || !match[1]) return false;

        return isValidBook(match[1])
}
