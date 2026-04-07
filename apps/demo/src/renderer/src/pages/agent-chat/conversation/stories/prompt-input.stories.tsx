import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { PromptInput } from '../input/prompt-input.js';

const overflowText = Array.from({ length: 28 }, (_, index) => {
	return `Line ${index + 1}: The prompt should clamp, then use the custom scroll area instead of the native textarea scrollbar.`;
}).join('\n');

const meta = {
	title: 'Conversation/PromptInput',
	component: PromptInput,
	decorators: [
		(Story) => (
			<div className="mx-auto w-full max-w-xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		onSend: fn(),
		sending: false,
	},
};

export const Sending: Story = {
	args: {
		onSend: fn(),
		sending: true,
	},
};

export const Overflowing: Story = {
	args: {
		onSend: fn(),
		sending: false,
		defaultValue: overflowText,
	},
};
