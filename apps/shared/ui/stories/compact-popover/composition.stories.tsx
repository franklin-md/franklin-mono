import type { Meta, StoryObj } from '@storybook/react-vite';
import { Expand, Scissors } from 'lucide-react';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button, CompactPopover, IconActionGroup } from '../../src/index.js';

const meta = {
	title: 'Components/CompactPopover',
	component: CompactPopover,
	render: function Render() {
		const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
		const [action, setAction] = useState('None');
		return (
			<div className="flex min-h-96 items-end gap-4">
				<Button onClick={(event) => setAnchor(event.currentTarget)}>
					Open tools
				</Button>
				<output aria-label="Selected preset">{action}</output>
				{anchor && (
					<CompactPopover
						anchor={{
							contextElement: anchor,
							getBoundingClientRect: () => anchor.getBoundingClientRect(),
						}}
						label="Prompt tools"
						onClose={(restoreFocus) => {
							setAnchor(null);
							if (restoreFocus) anchor.focus();
						}}
					>
						<IconActionGroup
							label="Presets"
							actions={[
								{ id: 'expand', label: 'Expand', icon: Expand },
								{ id: 'condense', label: 'Condense', icon: Scissors },
							]}
							onAction={setAction}
						/>
						<textarea aria-label="Request" />
						<select aria-label="Style">
							<option>Brief</option>
							<option>Detailed</option>
						</select>
					</CompactPopover>
				)}
			</div>
		);
	},
} satisfies Meta<typeof CompactPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardComposition: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);
		const trigger = canvas.getByRole('button', { name: 'Open tools' });
		await userEvent.click(trigger);
		await waitFor(() => expect(body.getByRole('button', { name: 'Expand' })).toHaveFocus());
		await userEvent.keyboard('{End}{Enter}');
		await expect(canvas.getByRole('status')).toHaveTextContent('condense');
		await userEvent.keyboard('{Home} ');
		await expect(canvas.getByRole('status')).toHaveTextContent('expand');
		const input = body.getByRole('textbox', { name: 'Request' });
		await userEvent.click(input);
		await userEvent.type(input, 'Line one{Enter}Line two');
		await expect(input).toHaveValue('Line one\nLine two');
		await expect(canvas.getByRole('status')).toHaveTextContent('expand');
		await userEvent.keyboard('{Escape}');
		await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());
		await expect(trigger).toHaveFocus();
	},
};
