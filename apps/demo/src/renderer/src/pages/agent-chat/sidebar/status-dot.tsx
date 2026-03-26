import type { StatusState } from '@franklin/extensions';

import { cn } from '@/lib/utils';

export function StatusDot({ status }: { status: StatusState }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'size-2 shrink-0 rounded-full transition-colors',
				status === 'idle' && 'invisible',
				status === 'unread' && 'bg-primary',
				status === 'in-progress' && 'bg-muted-foreground/60',
			)}
		/>
	);
}
