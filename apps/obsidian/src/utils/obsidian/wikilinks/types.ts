export interface ParsedWikilink {
	raw: string;
	linktext: string;
	linkpath: string;
	hasExplicitPath: boolean;
	hasMarkdownExtension: boolean;
}
