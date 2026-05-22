export interface GrepMatch {
	file: string;
	line: number;
	text: string;
}

export interface GrepResult {
	status: 'success' | 'error';
	text: string;
	matches: GrepMatch[];
	truncated: boolean;
}

export interface FormatMatchesOptions {
	truncated: boolean;
	maxLength?: number;
}
