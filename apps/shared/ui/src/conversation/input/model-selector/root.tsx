import { useState } from 'react';
import { Popover } from '../../../primitives/popover.js';
import { ModelPickerProvider } from './context.js';
import type { ModelPickerContextValue, ModelPickerRootProps } from './types.js';

export function ModelPickerRoot({
	catalog,
	provider,
	model,
	onSelect,
	children,
}: ModelPickerRootProps) {
	const [open, setOpen] = useState(false);
	const [view, setView] = useState<ModelPickerContextValue['view']>('models');
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
				view,
				setView,
				select: (entry) => {
					onSelect(entry.provider, entry.id);
					setOpen(false);
					setView('models');
				},
			}}
		>
			<Popover
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) setView('models');
				}}
			>
				{children}
			</Popover>
		</ModelPickerProvider>
	);
}
