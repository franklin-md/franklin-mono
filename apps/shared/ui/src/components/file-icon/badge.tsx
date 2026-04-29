import { getFilename } from '@franklin/lib';

import { cn } from '../../lib/cn.js';
import { Badge } from '../../primitives/badge.js';
import { resolveFileExtension } from './extension.js';
import { FileIcon } from './icon.js';

export interface FileBadgeProps {
	path: string;
	className?: string;
	iconExtension?: string;
}

export function FileBadge({ path, className, iconExtension }: FileBadgeProps) {
	const filename = getFilename(path);
	const { extension } = resolveFileExtension(filename, iconExtension);

	return (
		<Badge
			variant="outline"
			className={cn(
				'min-w-0 gap-1 border-0 bg-transparent px-1.5 font-normal text-current shadow-none',
				className,
			)}
		>
			<FileIcon filename={filename} extension={extension} className="h-3 w-3" />
			<span className="truncate">{filename}</span>
		</Badge>
	);
}
