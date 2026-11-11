import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '../../../primitives/button.js';
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandList,
} from '../../../primitives/command.js';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../primitives/popover.js';

import type { CatalogModel } from '../models/catalog.js';
import { MODEL_CATALOG } from '../models/catalog.js';
import { ModelIcon } from '../provider-icons.js';
import { ProviderSection } from './section.js';

type Props = {
	provider: string;
	model: string;
	onSelect: (provider: string, model: string) => void;
	label?: string;
};

export function ModelPicker({
	provider: selectedProvider,
	model: selectedModel,
	onSelect,
	label,
}: Props) {
	const [open, setOpen] = useState(false);

	const selectedEntry = useMemo(() => {
		for (const group of MODEL_CATALOG) {
			const found = group.models.find(
				(m) => m.id === selectedModel && m.provider === selectedProvider,
			);
			if (found) return found;
		}
		return null;
	}, [selectedProvider, selectedModel]);

	function handleSelect(model: CatalogModel) {
		onSelect(model.provider, model.id);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					aria-label={label}
					title={`${selectedProvider} · ${selectedModel}`}
					variant="ghost"
					size="sm"
					className="h-auto min-w-0 gap-1.5 px-2 py-1 text-xs text-muted-foreground"
				>
					{selectedEntry && (
						<ModelIcon model={selectedEntry} className="h-3.5 w-3.5" />
					)}
					<span className="max-w-[140px] truncate">
						{selectedEntry?.name ?? (selectedModel || 'Select model')}
					</span>
					<ChevronDown className="h-3 w-3 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-80 max-w-[var(--radix-popover-content-available-width)] p-0"
				side="top"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search models..." />
					<CommandList className="max-h-[360px]">
						<CommandEmpty>No models found</CommandEmpty>
						{MODEL_CATALOG.map((group) => (
							<ProviderSection
								key={group.provider}
								group={group}
								selectedModel={selectedModel}
								selectedProvider={selectedProvider}
								onSelect={handleSelect}
							/>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
