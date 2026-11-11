import type { ComponentPropsWithoutRef } from 'react';
import { CommandInput } from '../../../primitives/command.js';

type Props = ComponentPropsWithoutRef<typeof CommandInput>;

export function ModelPickerSearch(props: Props) {
	return (
		<CommandInput
			aria-label="Search models"
			placeholder="Search models..."
			{...props}
		/>
	);
}
