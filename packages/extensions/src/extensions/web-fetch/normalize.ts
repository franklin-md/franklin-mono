export function normalizeUrl(rawUrl: string): string {
	const url = new URL(rawUrl);
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error('Only HTTP and HTTPS URLs are supported');
	}
	url.hash = '';
	return url.toString();
}

export function normalizeExtractedText(text: string): string {
	return text
		.replace(/\r\n/g, '\n')
		.replace(/\u00A0/g, ' ')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function truncateText(
	text: string,
	maxOutputChars: number,
): { text: string; truncated: boolean } {
	if (text.length <= maxOutputChars) {
		return { text, truncated: false };
	}

	return {
		text: `${text.slice(0, maxOutputChars).trimEnd()}\n\n[truncated]`,
		truncated: true,
	};
}
