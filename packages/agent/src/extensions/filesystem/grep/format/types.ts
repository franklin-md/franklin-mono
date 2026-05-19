export interface GrepMatch {
	file: string;
	line: number;
	text: string;
}

export interface GrepResult {
	output: string;
	isError: boolean;
}

export interface FormatMatchesOptions {
	truncated: boolean;
	maxLength?: number;
}
