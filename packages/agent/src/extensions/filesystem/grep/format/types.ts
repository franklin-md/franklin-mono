export type GrepMatch = {
	readonly file: string;
	readonly line: number;
	readonly text: string;
};

export type GrepResult = {
	readonly status: 'success' | 'error';
	readonly text: string;
	readonly matches: GrepMatch[];
	readonly truncated: boolean;
};

export interface FormatMatchesOptions {
	truncated: boolean;
	maxLength?: number;
}
