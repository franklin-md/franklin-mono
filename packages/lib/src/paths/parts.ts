export function getFilename(path: string): string {
	return path.split('/').pop() ?? path;
}

export function getFilenameExtension(filename: string): string | undefined {
	const dotIndex = filename.lastIndexOf('.');
	if (dotIndex <= 0 || dotIndex === filename.length - 1) return undefined;
	return filename.slice(dotIndex + 1);
}
