import { Badge } from '../primitives/badge.js';
import { FileIcon } from './file-icon.js';
import { cn } from '../lib/cn.js';

export interface FileBadgeProps {
	path: string;
	className?: string;
}

export function FileBadge({ path, className }: FileBadgeProps) {
	const name = path.split('/').pop() ?? path;

	return (
		<Badge
			variant="plain"
			className={cn('min-w-0 gap-1 px-1.5 font-normal', className)}
		>
			<FileIcon filename={name} className="h-3 w-3" />
			<span className="truncate">{name}</span>
		</Badge>
	);
}
