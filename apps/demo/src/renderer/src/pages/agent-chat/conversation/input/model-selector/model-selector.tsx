import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useModelSelection } from '@franklin/react';

import { Button } from '@/components/ui/button.js';
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandList,
} from '@/components/ui/command.js';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover.js';

import type { CatalogModel } from '../models/catalog.js';
import { MODEL_CATALOG } from '../models/catalog.js';
import { ModelIcon } from '../provider-icons.js';
import { ProviderSection } from './provider-section.js';

export function ModelSelector() {
	const {
		provider: selectedProvider,
		model: selectedModel,
		setModel,
	} = useModelSelection();
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
		void setModel(model.provider, model.id);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-auto gap-1.5 px-2 py-1 text-xs text-muted-foreground"
				>
					{selectedEntry && (
						<ModelIcon model={selectedEntry} className="h-3.5 w-3.5" />
					)}
					<span className="max-w-[140px] truncate">
						{selectedEntry?.name ?? 'Select model'}
					</span>
					<ChevronDown className="h-3 w-3 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" side="top" align="start">
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
