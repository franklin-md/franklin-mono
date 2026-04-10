// export function normalizeUrl(rawUrl: string): string {
// 	const url = new URL(rawUrl);
// 	if (!['http:', 'https:'].includes(url.protocol)) {
// 		throw new Error('Only HTTP and HTTPS URLs are supported');
// 	}
// 	if (url.protocol === 'http:' && !isPrivateHost(url.hostname)) {
// 		url.protocol = 'https:';
// 	}
// 	url.hash = '';
// 	return url.toString();
// }

// function  isPublicHost(host: string): boolean {
// 	const normalized = normalizeHost(host);

// 	if (
// 		normalized === 'localhost' ||
// 		normalized === '0.0.0.0' ||
// 		normalized === '::' ||
// 		normalized === '::1'
// 	) {
// 		return false;
// 	}

// 	const ipv4 = parseIPv4(normalized);
// 	if (ipv4 !== null) {
// 		const [a, b] = ipv4;
// 		return !(
// 			a === 0 ||
// 			a === 10 ||
// 			a === 127 ||
// 			(a === 100 && b >= 64 && b <= 127) ||
// 			(a === 169 && b === 254) ||
// 			(a === 172 && b >= 16 && b <= 31) ||
// 			(a === 192 && b === 168)
// 		);
// 	}

// 	return !(
// 		normalized.startsWith('fe80:') ||
// 		normalized.startsWith('fc') ||
// 		normalized.startsWith('fd')
// 	);
// }

// function normalizeHost(host: string): string {
// 	if (host.startsWith('[') && host.endsWith(']')) {
// 		return host.slice(1, -1).toLowerCase();
// 	}
// 	return host.toLowerCase();
// }

// function parseIPv4(host: string): [number, number, number, number] | null {
// 	const parts = host.split('.');
// 	if (parts.length !== 4) return null;

// 	const nums = parts.map(Number);
// 	if (nums.some((n) => isNaN(n) || n < 0 || n > 255 || !Number.isInteger(n))) {
// 		return null;
// 	}

// 	return nums as [number, number, number, number];
// }

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

export function normalizeContentType(contentType?: string): string | undefined {
	return contentType?.split(';', 1)[0]?.trim().toLowerCase();
}

export function decodeBody(body: Uint8Array): string {
	return new TextDecoder().decode(body);
}

export function startsWithAscii(body: Uint8Array, prefix: string): boolean {
	return decodeBody(body.slice(0, prefix.length)) === prefix;
}

export function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
