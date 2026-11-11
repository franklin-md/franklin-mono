import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from '../../../primitives/button.js';
import {
	Command,
	CommandItem,
	CommandList,
} from '../../../primitives/command.js';
import { useModelPicker } from './context.js';
import { EFFORT_LABELS } from './effort-labels.js';
import type { ModelPickerEffortProps } from './types.js';

export function ModelPickerEffort({
	level,
	levels,
	onChange,
}: ModelPickerEffortProps) {
	const { view, setView } = useModelPicker();
	const trigger = useRef<HTMLButtonElement>(null);
	const choices = useRef<HTMLDivElement>(null);
	const previousView = useRef(view);
	useLayoutEffect(() => {
		if (view === 'effort') choices.current?.focus();
		else if (previousView.current === 'effort') trigger.current?.focus();
		previousView.current = view;
	}, [view]);
	// Removing this optional section while its view is open must reveal models.
	useEffect(() => () => setView('models'), [setView]);

	if (view === 'effort')
		return (
			<>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="mb-1 w-full justify-start gap-2"
					onClick={() => setView('models')}
				>
					<ArrowLeft className="h-3.5 w-3.5" /> Back to models
				</Button>
				<Command defaultValue={level} loop aria-label="Effort levels">
					<CommandList ref={choices} label="Effort levels">
						{levels.map((choice) => (
							<CommandItem
								key={choice}
								value={choice}
								onSelect={() => {
									onChange(choice);
									setView('models');
								}}
							>
								<span>{EFFORT_LABELS[choice]}</span>
								{choice === level && (
									<Check aria-hidden="true" className="ml-auto h-3.5 w-3.5" />
								)}
							</CommandItem>
						))}
					</CommandList>
				</Command>
			</>
		);

	return (
		<Button
			ref={trigger}
			type="button"
			variant="ghost"
			size="sm"
			className="w-full justify-between gap-2 px-2 text-sm"
			aria-label={`Effort: ${EFFORT_LABELS[level]}`}
			aria-haspopup="listbox"
			disabled={levels.length === 0}
			onClick={() => setView('effort')}
		>
			<span>Effort</span>
			<span className="ml-auto truncate text-muted-foreground">
				{EFFORT_LABELS[level]}
			</span>
			<ChevronRight
				aria-hidden="true"
				className="h-3.5 w-3.5 text-muted-foreground"
			/>
		</Button>
	);
}
