import { CommandItem } from '@/components/ui/command.js';
import { cn } from '@/lib/utils.js';

import type { CatalogModel } from '../models/catalog.js';
import { ModelIcon } from '../provider-icons.js';

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
			<ModelIcon model={model} className="h-3.5 w-3.5 shrink-0" />
			<span className={cn('min-w-0 truncate', selected && 'font-medium')}>
				{model.name}
			</span>

			{model.free && (
				<span className="ml-auto rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-medium leading-none text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
					Free
				</span>
			)}
		</CommandItem>
	);
}
