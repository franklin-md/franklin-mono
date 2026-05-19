import { decode } from '@franklin/lib';

export function normalizeExtractedText(text: string): string {
	return (
		text
			.replace(/\r\n/g, '\n')
			.replace(/\u00A0/g, ' ')
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
			.replace(/[ \t]+\n/g, '\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	);
}

export function singleLine(text: string | null): string {
	return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeContentType(contentType?: string): string | undefined {
	return contentType?.split(';', 1)[0]?.trim().toLowerCase();
}

export { decode as decodeBody } from '@franklin/lib';

export function startsWithAscii(body: Uint8Array, prefix: string): boolean {
	return decode(body.slice(0, prefix.length)) === prefix;
}

export function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
