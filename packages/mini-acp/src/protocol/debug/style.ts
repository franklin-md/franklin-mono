export const ANSI_RESET = '\x1b[0m';
export const ANSI_BOLD = '\x1b[1m';
export const ANSI_DIM = '\x1b[2m';
export const ANSI_GREEN = '\x1b[32m';
export const ANSI_BLUE = '\x1b[34m';
export const ANSI_RED = '\x1b[31m';
export const ANSI_YELLOW = '\x1b[33m';
export const ANSI_CYAN = '\x1b[36m';
const INDENT = '  ';

export function paint(value: string, color: string): string {
	return `${color}${value}${ANSI_RESET}`;
}

export function bold(value: string): string {
	return `${ANSI_BOLD}${value}${ANSI_RESET}`;
}

export function colorAction(
	action: string,
	remainder: string,
	color: string,
): string {
	const suffix = remainder.length > 0 ? ` ${remainder}` : '';
	return `${color}${ANSI_BOLD}${action}${ANSI_RESET}${color}${suffix}${ANSI_RESET}`;
}

export function line(label: string, value: string): string {
	return `[${label}] ${value}`;
}

export function logLines(label: string, values: readonly string[]): void {
	for (const value of values) {
		console.log(line(label, value));
	}
}

export function indent(level: number, value: string): string {
	return `${INDENT.repeat(level)}${value}`;
}

export function collapseWhitespace(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}
