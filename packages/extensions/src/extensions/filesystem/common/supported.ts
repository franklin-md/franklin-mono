export function isSupportedImageType(mime: string): boolean {
	switch (mime.toLowerCase()) {
		case 'image/jpeg':
		case 'image/jpg':
		case 'image/png':
		case 'image/gif':
		case 'image/webp':
			return true;
		default:
			return false;
	}
}

export function isPDF(mime: string): boolean {
	return mime.toLowerCase() === 'application/pdf';
}
