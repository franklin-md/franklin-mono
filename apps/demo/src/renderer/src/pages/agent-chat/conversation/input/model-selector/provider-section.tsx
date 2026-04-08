import { CommandGroup } from '@/components/ui/command.js';
import { Badge } from '@/components/ui/badge.js';

import type { CatalogModel, ProviderGroup } from '../models/catalog.js';
import { ProviderIcon } from '../provider-icons.js';
import { ModelRow } from './model-row.js';

export function ProviderSection({
	group,
	selectedModel,
	selectedProvider,
	onSelect,
}: {
	group: ProviderGroup;
	selectedModel: string;
	selectedProvider: string;
	onSelect: (model: CatalogModel) => void;
}) {
	return (
		<CommandGroup
			heading={
				<span className="flex items-center gap-2">
					<ProviderIcon
						provider={group.provider}
						className="h-3.5 w-3.5 text-muted-foreground"
					/>
					<span>{group.displayName}</span>
					<Badge
						variant="outline"
						className="ml-auto h-4 px-1.5 py-0 text-[10px] font-medium uppercase leading-4"
					>
						{group.access === 'sub' ? 'Sub' : 'API'}
					</Badge>
				</span>
			}
		>
			{group.models.map((model) => (
				<ModelRow
					key={model.id}
					model={model}
					selected={
						model.id === selectedModel && model.provider === selectedProvider
					}
					onSelect={() => onSelect(model)}
				/>
			))}
		</CommandGroup>
	);
}
