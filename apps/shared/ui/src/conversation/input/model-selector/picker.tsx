import { useState } from 'react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../primitives/popover.js';
import { MODEL_CATALOG } from '../models/catalog.js';
import { ProviderAuthAction } from './auth-shortcut/index.js';
import { EffortChoice } from './effort.js';
import { ModelList } from './list.js';
import { ModelTrigger } from './trigger.js';
import type { ModelPickerProps, ProviderActionRenderer } from './types.js';

const renderAuthAction: ProviderActionRenderer = (group) => (
	<ProviderAuthAction {...group} />
);

// Recipe shared by Inbox, Quick Edit and chat. It composes the public field
// pickers and owns only its popover's open state; both values stay with the
// caller.
export function ModelPicker({
	value,
	onChange,
	label,
	className,
	catalog = MODEL_CATALOG,
	renderProviderAction = renderAuthAction,
	effort,
}: ModelPickerProps) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<ModelTrigger
					aria-label={label}
					className={className}
					value={value}
					catalog={catalog}
					effort={effort?.value}
				/>
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="start"
				className="flex max-h-[var(--radix-popover-content-available-height)] w-80 max-w-[var(--radix-popover-content-available-width)] flex-col overflow-hidden p-0"
			>
				<ModelList
					catalog={catalog}
					value={value}
					renderProviderAction={renderProviderAction}
					onChange={(next) => {
						onChange(next);
						setOpen(false);
					}}
				/>
				{effort && (
					<>
						<div role="separator" className="h-px shrink-0 bg-border" />
						<div className="min-h-0 shrink-0 overflow-y-auto p-1">
							<EffortChoice {...effort} />
						</div>
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}
