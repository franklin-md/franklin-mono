import { getFilenameExtension } from '@franklin/lib';

function normalizeExtension(extension: string | undefined): string | undefined {
	const normalizedExtension = extension
		?.replace(/^\./, '')
		.trim()
		.toLowerCase();
	return normalizedExtension ? normalizedExtension : undefined;
}

export function resolveFileExtension(
	filename: string,
	extensionOverride: string | undefined,
): string | undefined {
	const candidateExtension =
		extensionOverride ?? getFilenameExtension(filename);
	return normalizeExtension(candidateExtension);
}
