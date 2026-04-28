import { CommandGroup } from '../../../primitives/command.js';

import type { CatalogModel, ProviderGroup } from '../models/catalog.js';
import { ProviderIcon } from '../provider-icons.js';
import { ProviderAuthAction } from './auth-shortcut/index.js';
import { ModelRow } from './row.js';

type Props = {
	group: ProviderGroup;
	selectedModel: string;
	selectedProvider: string;
	onSelect: (model: CatalogModel) => void;
};

export function ProviderSection({
	group,
	selectedModel,
	selectedProvider,
	onSelect,
}: Props) {
	return (
		<CommandGroup
			heading={
				<span className="flex w-full items-center gap-2">
					<ProviderIcon
						provider={group.provider}
						className="h-3.5 w-3.5 text-muted-foreground"
					/>
					<span>{group.displayName}</span>
					<ProviderAuthAction
						access={group.access}
						displayName={group.displayName}
						provider={group.provider}
					/>
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
