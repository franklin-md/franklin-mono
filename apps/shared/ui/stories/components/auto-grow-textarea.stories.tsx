import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AutoGrowTextarea } from '../../src/components/auto-grow-textarea.js';

interface AutoGrowTextareaStoryProps {
	readonly initialValue?: string;
	readonly maxLines?: number;
	readonly minLines?: number;
}

function AutoGrowTextareaStory({
	initialValue = '',
	maxLines,
	minLines = 2,
}: AutoGrowTextareaStoryProps) {
	const [value, setValue] = useState(initialValue);

	return (
		<div className="w-96 p-4">
			<label htmlFor="auto-grow-textarea" className="mb-2 block text-sm">
				Draft
			</label>
			<div data-testid="auto-grow-shell">
				<AutoGrowTextarea
					id="auto-grow-textarea"
					minLines={minLines}
					maxLines={maxLines}
					value={value}
					onChange={(event) => setValue(event.currentTarget.value)}
					className="leading-5"
				/>
			</div>
			<output data-testid="auto-grow-value" hidden>
				{value}
			</output>
		</div>
	);
}

const meta = {
	title: 'Components/AutoGrowTextarea',
	component: AutoGrowTextareaStory,
} satisfies Meta<typeof AutoGrowTextareaStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutMaxLines: Story = {
	args: { initialValue: 'Short draft', minLines: 3 },
};

export const ClampedByMaxLines: Story = {
	args: {
		minLines: 2,
		maxLines: 3,
		initialValue: [
			'Line one',
			'Line two',
			'Line three',
			'Line four',
			'Line five',
			'Line six',
		].join('\n'),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const textbox = canvas.getByRole('textbox', { name: 'Draft' });
		const shell = canvas.getByTestId('auto-grow-shell');

		await waitFor(async () => {
			await expect(shell.getBoundingClientRect().height).toBeGreaterThan(0);
			await expect(textbox.getBoundingClientRect().height).toBeGreaterThan(0);
		});
		await expect(shell.getBoundingClientRect().height).toBeLessThan(
			textbox.getBoundingClientRect().height,
		);
	},
};

export const GrowsWhileTyping: Story = {
	args: { initialValue: 'Line one', minLines: 2, maxLines: 5 },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const textbox = canvas.getByRole('textbox', { name: 'Draft' });
		const initialHeight = textbox.getBoundingClientRect().height;

		await userEvent.click(textbox);
		await userEvent.type(textbox, '{end}{enter}Line two{enter}Line three');

		await waitFor(async () => {
			await expect(textbox.getBoundingClientRect().height).toBeGreaterThan(
				initialHeight,
			);
		});
		await expect(canvas.getByTestId('auto-grow-value').textContent).toContain(
			'Line three',
		);
	},
};
