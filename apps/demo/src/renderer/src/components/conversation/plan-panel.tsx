import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

import type { Plan, PlanEntryStatus } from '@agentclientprotocol/sdk';
import { cn } from '@/lib/utils';

export interface PlanPanelProps {
	plan: Plan;
}

const STATUS_ICONS: Record<
	PlanEntryStatus,
	React.ComponentType<{ className?: string }>
> = {
	pending: Circle,
	in_progress: Loader2,
	completed: CheckCircle2,
};

export function PlanPanel({ plan }: PlanPanelProps) {
	if (plan.entries.length === 0) return null;

	return (
		<div className="rounded-lg border bg-card px-4 py-3">
			<p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Plan
			</p>
			<ul className="space-y-1.5">
				{plan.entries.map((entry, i) => {
					const Icon = STATUS_ICONS[entry.status];
					return (
						<li key={i} className="flex items-start gap-2 text-sm">
							<Icon
								className={cn(
									'mt-0.5 h-4 w-4 shrink-0',
									entry.status === 'completed' && 'text-green-500',
									entry.status === 'in_progress' &&
										'animate-spin text-blue-500',
									entry.status === 'pending' && 'text-muted-foreground',
								)}
							/>
							<span
								className={cn(
									entry.status === 'completed' &&
										'text-muted-foreground line-through',
									entry.priority === 'high' && 'font-medium',
								)}
							>
								{entry.content}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
