import { File } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { resolveFileExtension } from './extension.js';
import { EXT_ICONS, FILENAME_ICONS, type IconEntry } from './branding.js';

const FALLBACK: IconEntry = { icon: File };

function resolveEntry(
	filename: string,
	extension: string | undefined,
): IconEntry {
	const ext = resolveFileExtension(filename, extension);

	if (ext) {
		const extEntry = EXT_ICONS[ext];
		if (extEntry) return extEntry;
	}

	const filenameEntry = FILENAME_ICONS[filename.toLowerCase()];
	if (filenameEntry) return filenameEntry;

	return FALLBACK;
}

export interface FileIconProps {
	filename: string;
	extension?: string;
	className?: string;
	withBrandColor?: boolean;
}

export function FileIcon({
	filename,
	extension,
	className,
	withBrandColor = false,
}: FileIconProps) {
	const { icon: Icon, color } = resolveEntry(filename, extension);
	return (
		<Icon
			className={cn('shrink-0', className)}
			color={withBrandColor ? color : undefined}
		/>
	);
}
