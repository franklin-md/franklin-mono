export const ANSI_RESET = '\x1b[0m';
export const ANSI_DIM = '\x1b[2m';
export const ANSI_RED = '\x1b[31m';
export const ANSI_YELLOW = '\x1b[33m';
export const ANSI_CYAN = '\x1b[36m';

export function paint(value: string, color: string): string {
	return `${color}${value}${ANSI_RESET}`;
}

export function line(label: string, value: string): string {
	return `[${label}] ${value}`;
}

export function truncate(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function collapseWhitespace(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}
