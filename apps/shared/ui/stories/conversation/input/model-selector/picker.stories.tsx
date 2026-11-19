import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { THINKING_LEVELS } from '@franklin/mini-acp';
import type { ThinkingLevel } from '@franklin/mini-acp';
import {
	EffortChoice,
	MODEL_CATALOG,
	ModelList,
	ModelPicker,
	ModelTrigger,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../../src/index.js';

const meta = {
	title: 'Conversation/ModelPicker',
	component: ModelPicker,
	args: {
		value: { provider: 'openai-codex', model: 'gpt-6.2-sol' },
		onChange: () => {},
		renderProviderAction: () => null,
	},
	decorators: [
		(Story) => (
			<div className="flex min-h-[500px] items-end p-4">
				<Story />
			</div>
		),
	],
	render: function Render(args) {
		const [value, setValue] = useState(args.value);
		const [level, setLevel] = useState<ThinkingLevel>('medium');
		return (
			<ModelPicker
				{...args}
				value={value}
				onChange={setValue}
				effort={
					args.effort && { ...args.effort, value: level, onChange: setLevel }
				}
			/>
		);
	},
} satisfies Meta<typeof ModelPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ModelOnly: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);
		await userEvent.click(canvas.getByRole('button'));
		await waitFor(() => expect(body.getByRole('combobox')).toHaveFocus());
		await userEvent.type(body.getByRole('combobox'), 'GPT-5.6 Terra');
		await userEvent.click(
			await body.findByRole('option', { name: 'GPT-5.6 Terra' }),
		);
		await expect(canvas.getByRole('button')).toHaveTextContent('GPT-5.6 Terra');
		await waitFor(() =>
			expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
		);
		await expect(body.queryByRole('radiogroup')).not.toBeInTheDocument();
	},
};
export const WithEffort: Story = {
	args: {
		effort: { value: 'medium', levels: THINKING_LEVELS, onChange: () => {} },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);
		const trigger = canvas.getByRole('button');
		await userEvent.click(trigger);
		await userEvent.type(body.getByRole('combobox'), 'no-such-model');
		const selected = body.getByRole('radio', { name: 'Medium' });
		await userEvent.click(selected);
		// Radix roving focus moves focus in a timeout and checks the item only
		// while the arrow key is still down, so hold it as a person would.
		await userEvent.keyboard('{ArrowRight>}');
		await waitFor(() =>
			expect(body.getByRole('radio', { name: 'High' })).toBeChecked(),
		);
		await userEvent.keyboard('{/ArrowRight}');
		await expect(trigger).toHaveTextContent('High');
		await expect(body.getByRole('combobox')).toHaveValue('no-such-model');
		await userEvent.keyboard('{Escape}');
		await waitFor(() =>
			expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
		);
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};
// Callers compose the field pickers in their own popover, as with IconGrid.
// Picking a model closes it; changing effort keeps it open.
export const ComposedInPopover: Story = {
	render: function Render() {
		const [open, setOpen] = useState(false);
		const [model, setModel] = useState({
			provider: 'custom',
			model: 'saved-model',
		});
		const [level, setLevel] = useState<ThinkingLevel>('low');
		const catalog = MODEL_CATALOG.slice(0, 1);
		return (
			<div className="flex items-center gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<ModelTrigger
							variant="outline"
							value={model}
							catalog={catalog}
							effort={level}
						/>
					</PopoverTrigger>
					<PopoverContent
						side="top"
						align="start"
						className="flex w-80 flex-col overflow-hidden p-0"
					>
						<ModelList
							catalog={catalog}
							value={model}
							onChange={(next) => {
								setModel(next);
								setOpen(false);
							}}
						/>
						<div role="separator" className="h-px bg-border" />
						<div className="p-1">
							<EffortChoice
								value={level}
								levels={THINKING_LEVELS}
								onChange={setLevel}
							/>
						</div>
					</PopoverContent>
				</Popover>
				<output aria-label="Selection" className="text-sm">
					{model.provider}/{model.model} · {level}
				</output>
			</div>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);
		const result = canvas.getByRole('status');
		await userEvent.click(canvas.getByRole('button'));
		// Search is the first focusable control, so Radix focuses it on open.
		await waitFor(() => expect(body.getByRole('combobox')).toHaveFocus());
		await userEvent.click(body.getByRole('radio', { name: 'High' }));
		await expect(result).toHaveTextContent('custom/saved-model · high');
		await expect(body.getByRole('dialog')).toBeInTheDocument();
		await userEvent.click(body.getByRole('combobox'));
		await userEvent.keyboard('{ArrowDown}{Enter}');
		await waitFor(() =>
			expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
		);
		await expect(result).not.toHaveTextContent('saved-model');
	},
};
