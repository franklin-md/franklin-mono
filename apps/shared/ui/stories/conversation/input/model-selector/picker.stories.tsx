import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { THINKING_LEVELS } from '@franklin/mini-acp';
import type { ThinkingLevel } from '@franklin/mini-acp';
import {
	MODEL_CATALOG,
	ModelPicker,
	ModelPickerRoot,
	ModelPickerTrigger,
	ModelPickerContent,
	ModelPickerModels,
	ModelPickerList,
} from '../../../../src/index.js';

const meta = {
	title: 'Conversation/ModelPicker',
	component: ModelPicker,
	args: {
		provider: 'openai-codex',
		model: 'gpt-5.6-sol',
		onSelect: () => {},
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
		const [selection, setSelection] = useState({
			provider: args.provider,
			model: args.model,
		});
		const [level, setLevel] = useState<ThinkingLevel>('medium');
		return (
			<ModelPicker
				{...args}
				{...selection}
				onSelect={(provider, model) => setSelection({ provider, model })}
				effort={args.effort && { ...args.effort, level, onChange: setLevel }}
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
		await userEvent.type(body.getByRole('combobox'), 'GPT-5.6 Terra');
		await userEvent.click(await body.findByRole('option', { name: 'GPT-5.6 Terra' }));
		await expect(canvas.getByRole('button')).toHaveTextContent('GPT-5.6 Terra');
		await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
		await expect(body.queryByRole('radiogroup')).not.toBeInTheDocument();
	},
};
export const WithEffort: Story = {
	args: {
		effort: { level: 'medium', levels: THINKING_LEVELS, onChange: () => {} },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);
		const trigger = canvas.getByRole('button');
		await userEvent.click(trigger);
		await userEvent.type(body.getByRole('combobox'), 'no-such-model');
		const selected = body.getByRole('radio', { name: 'Medium' });
		await userEvent.click(selected);
		await userEvent.keyboard('{ArrowRight}');
		await expect(body.getByRole('radio', { name: 'High' })).toBeChecked();
		await expect(trigger).toHaveTextContent('High');
		await expect(body.getByRole('combobox')).toHaveValue('no-such-model');
		await userEvent.keyboard('{Escape}');
		await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};
export const CustomTriggerWithoutSearch: Story = {
	render: function Render() {
		const [selection, setSelection] = useState({
			provider: 'custom',
			model: 'saved-model',
		});
		return (
			<ModelPickerRoot
				catalog={MODEL_CATALOG.slice(0, 1)}
				{...selection}
				onSelect={(provider, model) => setSelection({ provider, model })}
			>
				<ModelPickerTrigger asChild>
					<button>Model: {selection.model}</button>
				</ModelPickerTrigger>
				<ModelPickerContent>
					<ModelPickerModels>
						<ModelPickerList />
					</ModelPickerModels>
				</ModelPickerContent>
			</ModelPickerRoot>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);
		await userEvent.click(canvas.getByRole('button'));
		await expect(body.queryByRole('combobox')).not.toBeInTheDocument();
		await userEvent.keyboard('{ArrowDown}{Enter}');
		await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());
		await expect(canvas.getByRole('button')).not.toHaveTextContent('saved-model');
	},
};
