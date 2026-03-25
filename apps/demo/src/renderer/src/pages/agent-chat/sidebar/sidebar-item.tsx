import type { StatusState } from '@franklin/agent/browser';

import { cn } from '@/lib/utils';
import { StatusDot } from './status-dot.js';

export function SidebarItem({
	name,
	status,
	active,
	onClick,
}: {
	name: string;
	status: StatusState;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
				active
					? 'bg-accent text-accent-foreground'
					: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
			)}
		>
			<span className="flex items-center gap-2">
				<StatusDot status={status} />
				<span>{name}</span>
			</span>
		</button>
	);
}
