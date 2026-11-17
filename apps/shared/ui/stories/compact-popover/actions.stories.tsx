import type { Meta, StoryObj } from '@storybook/react-vite';
import { Expand, Scissors } from 'lucide-react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { IconActionGroup } from '../../src/index.js';

function Actions() {
	const [selection, setSelection] = useState({ id: 'None', count: 0 });
	return (
		<div className="flex min-h-96 items-end gap-4">
			<button type="button">Before actions</button>
			<IconActionGroup
				label="Presets"
				actions={[
					{ id: 'expand', label: 'Expand', icon: Expand },
					{ id: 'condense', label: 'Condense', icon: Scissors },
				]}
				onAction={(id) => {
					setSelection(({ count }) => ({ id, count: count + 1 }));
				}}
			/>
			<output aria-label="Selected preset">
				{selection.id} ({selection.count})
			</output>
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
		const expand = canvas.getByRole('button', { name: 'Expand' });
		const condense = canvas.getByRole('button', { name: 'Condense' });
		const result = canvas.getByRole('status');
		const input = canvas.getByRole('textbox', { name: 'Request' });
		await userEvent.click(expand);
		await userEvent.keyboard('{End}');
		await expect(condense).toHaveFocus();
		await userEvent.keyboard('{Enter}');
		await expect(result).toHaveTextContent('condense (2)');
		await userEvent.keyboard('{Home}');
		await expect(expand).toHaveFocus();
		await userEvent.keyboard(' ');
		await expect(result).toHaveTextContent('expand (3)');
		for (const [key, target] of [
			['ArrowLeft', condense],
			['ArrowRight', expand],
			['ArrowDown', condense],
			['ArrowUp', expand],
		] as const) {
			await userEvent.keyboard(`{${key}}`);
			await expect(target).toHaveFocus();
		}
		await userEvent.tab();
		await expect(input).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect(expand).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect(
			canvas.getByRole('button', { name: 'Before actions' }),
		).toHaveFocus();
		await userEvent.click(input);
		await userEvent.type(input, 'Line one{Enter}Line two');
		await expect(input).toHaveValue('Line one\nLine two');
		await expect(result).toHaveTextContent('expand (3)');
	},
};
