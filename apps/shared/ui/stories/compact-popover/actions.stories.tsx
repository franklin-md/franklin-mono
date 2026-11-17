import type { Meta, StoryObj } from '@storybook/react-vite';
import { Expand, Scissors } from 'lucide-react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { IconActionGroup } from '../../src/index.js';

function Actions() {
	const [action, setAction] = useState('None');
	return (
		<div className="flex min-h-96 items-end gap-4">
			<IconActionGroup
				label="Presets"
				actions={[
					{ id: 'expand', label: 'Expand', icon: Expand },
					{ id: 'condense', label: 'Condense', icon: Scissors },
				]}
				onAction={setAction}
			/>
			<output aria-label="Selected preset">{action}</output>
			<textarea aria-label="Request" />
		</div>
	);
}

const meta = {
	title: 'Components/IconActionGroup',
	component: Actions,
} satisfies Meta<typeof Actions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardNavigation: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', { name: 'Expand' }));
		await userEvent.keyboard('{End}{Enter}');
		await expect(canvas.getByRole('status')).toHaveTextContent('condense');
		await userEvent.keyboard('{Home} ');
		await expect(canvas.getByRole('status')).toHaveTextContent('expand');
		const input = canvas.getByRole('textbox', { name: 'Request' });
		await userEvent.click(input);
		await userEvent.type(input, 'Line one{Enter}Line two');
		await expect(input).toHaveValue('Line one\nLine two');
		await expect(canvas.getByRole('status')).toHaveTextContent('expand');
	},
};
