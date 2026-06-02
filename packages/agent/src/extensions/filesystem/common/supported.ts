import { filetypemime } from 'magic-bytes.js';

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/gif',
	'image/webp',
]);

type DetectedFileType = {
	readonly mime: string;
};

export function detectFileType(
	bytes: Uint8Array,
): DetectedFileType | undefined {
	const mime = filetypemime(bytes)[0];
	return mime ? { mime } : undefined;
}

export function isSupportedImageType(mime: string): boolean {
	return SUPPORTED_IMAGE_MIME_TYPES.has(mime.toLowerCase());
}

export function isPDF(mime: string): boolean {
	return mime.toLowerCase() === 'application/pdf';
}
