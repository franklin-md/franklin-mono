import { CommandItem } from '@/components/ui/command.js';
import { cn } from '@/lib/utils.js';

import type { CatalogModel } from '../models/catalog.js';
import { formatContextWindow, formatCost } from '../models/format.js';

export function ModelRow({
	model,
	selected,
	onSelect,
}: {
	model: CatalogModel;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<CommandItem
			value={`${model.provider}/${model.id}`}
			onSelect={onSelect}
			className={cn('gap-2', selected && 'bg-accent')}
		>
			<span className={cn('min-w-0 truncate', selected && 'font-medium')}>
				{model.name}
			</span>

			<div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
				{model.reasoning && (
					<span className="rounded bg-violet-100 px-1 py-0.5 text-[10px] font-medium leading-none text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
						Think
					</span>
				)}
				{model.free && (
					<span className="rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-medium leading-none text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
						Free
					</span>
				)}
				<span className="w-12 text-right tabular-nums">
					{formatCost(model.costOutput)}
					{model.costOutput > 0 && <span className="text-[9px]">/Mo</span>}
				</span>
				<span className="w-8 text-right tabular-nums text-[10px]">
					{formatContextWindow(model.contextWindow)}
				</span>
			</div>
		</CommandItem>
	);
}
