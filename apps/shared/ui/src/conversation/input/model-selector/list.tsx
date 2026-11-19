import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandList,
} from '../../../primitives/command.js';
import { ProviderSection } from './section.js';
import type { ModelListProps } from './types.js';

// The search input comes first, so a surrounding Radix Popover focuses it on
// open and cmdk's Arrow/Enter handling works from there.
export function ModelList({
	catalog,
	value,
	onChange,
	renderProviderAction,
}: ModelListProps) {
	return (
		<Command className="min-h-0">
			<CommandInput
				aria-label="Search models"
				placeholder="Search models..."
				className="text-xs"
			/>
			<CommandList label="Models" className="max-h-[360px]">
				<CommandEmpty>No models found</CommandEmpty>
				{catalog.map((group) => (
					<ProviderSection
						key={group.provider}
						group={group}
						selectedModel={value.model}
						selectedProvider={value.provider}
						onSelect={(entry) =>
							onChange({ provider: entry.provider, model: entry.id })
						}
						action={renderProviderAction?.(group)}
					/>
				))}
			</CommandList>
		</Command>
	);
}
