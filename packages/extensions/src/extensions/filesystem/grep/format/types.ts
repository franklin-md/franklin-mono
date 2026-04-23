export interface GrepMatch {
	file: string;
	line: number;
	text: string;
}

export interface FormatMatchesOptions {
	truncated: boolean;
	maxLength?: number;
}
