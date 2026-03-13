import type { ConversationUsage } from '@/lib/conversation';

export interface UsageBarProps {
	usage: ConversationUsage;
}

export function UsageBar({ usage }: UsageBarProps) {
	const pct = Math.min(100, Math.round((usage.used / usage.size) * 100));
	const isHigh = pct > 80;

	return (
		<div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
			<div className="flex-1">
				<div className="h-1.5 overflow-hidden rounded-full bg-muted">
					<div
						className={`h-full rounded-full transition-all ${isHigh ? 'bg-destructive' : 'bg-primary'}`}
						style={{ width: `${pct}%` }}
					/>
				</div>
			</div>
			<span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
				{usage.used.toLocaleString()} / {usage.size.toLocaleString()} tokens
				{usage.cost != null && (
					<>
						{' '}
						&middot; {usage.cost.currency} {usage.cost.amount.toFixed(4)}
					</>
				)}
			</span>
		</div>
	);
}
