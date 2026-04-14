import type { StatusState } from '@franklin/extensions';

import { DeleteButton } from '../components/delete-button.js';
import { cn } from '../lib/cn.js';
import { StatusDot } from './status-dot.js';

export function SidebarItem({
	name,
	status,
	active,
	onClick,
	onDelete,
}: {
	name: string;
	status: StatusState;
	active: boolean;
	onClick: () => void;
	onDelete?: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'group w-full rounded-xl px-3 py-2 text-left text-sm transition-colors',
				active
					? 'bg-background text-foreground ring-1 ring-inset ring-ring/50 shadow-sm'
					: 'text-muted-foreground hover:bg-background/65 hover:text-foreground',
			)}
		>
			<span className="flex items-center gap-2">
				<StatusDot status={status} />
				<span className="flex-1">{name}</span>
				{onDelete && <DeleteButton onClick={onDelete} />}
			</span>
		</button>
	);
}
