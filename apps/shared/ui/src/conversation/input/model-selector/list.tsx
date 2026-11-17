import type { ComponentPropsWithoutRef } from 'react';
import { CommandEmpty, CommandList } from '../../../primitives/command.js';
import { cn } from '../../../lib/cn.js';
import { useModelPicker } from './context.js';
import { ProviderSection } from './section.js';
import type { ProviderActionRenderer } from './types.js';

type Props = ComponentPropsWithoutRef<typeof CommandList> & {
	renderProviderAction?: ProviderActionRenderer;
};

export function ModelPickerList({
	renderProviderAction,
	className,
	...props
}: Props) {
	const { catalog, provider, model, select } = useModelPicker();
	return (
		<CommandList
			label="Models"
			className={cn('max-h-[360px]', className)}
			{...props}
		>
			<CommandEmpty>No models found</CommandEmpty>
			{catalog.map((group) => (
				<ProviderSection
					key={group.provider}
					group={group}
					selectedModel={model}
					selectedProvider={provider}
					onSelect={select}
					action={renderProviderAction?.(group)}
				/>
			))}
		</CommandList>
	);
}
