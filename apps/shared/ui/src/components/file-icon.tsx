import { File } from 'lucide-react';

import { cn } from '../lib/cn.js';
import {
	EXT_ICONS,
	FILENAME_ICONS,
	type IconEntry,
} from './file-icon/branding.js';

export {
	EXT_ICONS,
	FILENAME_ICONS,
	type IconEntry,
} from './file-icon/branding.js';

const FALLBACK: IconEntry = { icon: File };

function resolveEntry(filename: string): IconEntry {
	const lower = filename.toLowerCase();

	const filenameEntry = FILENAME_ICONS[lower];
	if (filenameEntry) return filenameEntry;

	const ext = lower.includes('.') ? lower.split('.').pop() : undefined;
	if (ext) {
		const extEntry = EXT_ICONS[ext];
		if (extEntry) return extEntry;
	}

	return FALLBACK;
}

export interface FileIconProps {
	filename: string;
	className?: string;
	withBrandColor?: boolean;
}

export function FileIcon({
	filename,
	className,
	withBrandColor = false,
}: FileIconProps) {
	const { icon: Icon, color } = resolveEntry(filename);
	return (
		<Icon
			className={cn('shrink-0', className)}
			color={withBrandColor ? color : undefined}
		/>
	);
}
