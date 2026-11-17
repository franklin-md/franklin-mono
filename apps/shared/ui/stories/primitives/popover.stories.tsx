import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../../src/primitives/button.js';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../src/primitives/popover.js';

function PopoverDemo() {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Open popover</Button>
			</PopoverTrigger>
			<PopoverContent className="space-y-2 p-4">
				<div className="space-y-1">
					<p className="text-sm font-medium">Repository actions</p>
					<p className="text-sm text-muted-foreground">
						Preview shared UI components in isolation before wiring them into
						the app shell.
					</p>
				</div>
				<Button size="sm">Launch Storybook</Button>
			</PopoverContent>
		</Popover>
	);
}

function CompactComposition() {
	const [open, setOpen] = useState(false);
	const [action, setAction] = useState('None');
	return (
		<div className="flex min-h-96 items-end gap-4">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button>Open tools</Button>
				</PopoverTrigger>
				<PopoverContent
					aria-label="Prompt tools"
					side="top"
					align="center"
					sideOffset={6}
					collisionPadding={8}
					className="w-max max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-auto p-1"
				>
					<button type="button" onClick={() => setAction('expand')}>
						Expand
					</button>
					<textarea aria-label="Request" />
					<select aria-label="Style">
						<option>Brief</option>
						<option>Detailed</option>
					</select>
				</PopoverContent>
			</Popover>
			<output aria-label="Selected preset">{action}</output>
			<Button>Outside action</Button>
		</div>
	);
}

const meta = {
	title: 'Primitives/Popover',
	component: PopoverDemo,
} satisfies Meta<typeof PopoverDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
	render: () => <CompactComposition />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);
		const trigger = canvas.getByRole('button', { name: 'Open tools' });
		await userEvent.click(trigger);
		await waitFor(() =>
			expect(body.getByRole('button', { name: 'Expand' })).toHaveFocus(),
		);
		await userEvent.keyboard('{Enter}');
		await expect(canvas.getByRole('status')).toHaveTextContent('expand');
		const input = body.getByRole('textbox', { name: 'Request' });
		await userEvent.tab();
		await expect(input).toHaveFocus();
		await userEvent.type(input, 'Line one{Enter}Line two');
		await expect(input).toHaveValue('Line one\nLine two');
		await expect(canvas.getByRole('status')).toHaveTextContent('expand');
		const picker = body.getByRole('combobox', { name: 'Style' });
		await userEvent.tab();
		await expect(picker).toHaveFocus();
		await userEvent.tab();
		await expect(body.getByRole('button', { name: 'Expand' })).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect(picker).toHaveFocus();
		await userEvent.click(input);
		await userEvent.keyboard('{Escape}');
		await waitFor(() =>
			expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
		);
		await expect(trigger).toHaveFocus();
		await userEvent.click(trigger);
		await waitFor(() =>
			expect(body.getByRole('button', { name: 'Expand' })).toHaveFocus(),
		);
		const outside = canvas.getByRole('button', { name: 'Outside action' });
		await userEvent.click(outside);
		await waitFor(() =>
			expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
		);
		await expect(outside).toHaveFocus();
	},
};
