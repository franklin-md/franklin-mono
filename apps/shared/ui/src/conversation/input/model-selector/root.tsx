import { useState } from 'react';
import { Popover } from '../../../primitives/popover.js';
import { ModelPickerProvider } from './context.js';
import type { ModelPickerRootProps } from './types.js';

export function ModelPickerRoot({
	catalog,
	provider,
	model,
	onSelect,
	children,
}: ModelPickerRootProps) {
	const [open, setOpen] = useState(false);
	const selectedEntry = catalog
		.flatMap((group) => group.models)
		.find((entry) => entry.id === model && entry.provider === provider);

	return (
		<ModelPickerProvider
			value={{
				catalog,
				provider,
				model,
				selectedEntry,
				select: (entry) => {
					onSelect(entry.provider, entry.id);
					setOpen(false);
				},
			}}
		>
			<Popover open={open} onOpenChange={setOpen}>
				{children}
			</Popover>
		</ModelPickerProvider>
	);
}
