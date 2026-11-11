import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
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
		model: 'gpt-6.1-sol',
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

export const ModelOnly: Story = {};
export const WithEffort: Story = {
	args: {
		effort: { level: 'medium', levels: THINKING_LEVELS, onChange: () => {} },
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
};
