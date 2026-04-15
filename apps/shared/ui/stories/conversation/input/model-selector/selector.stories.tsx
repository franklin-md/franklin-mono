import type { Meta, StoryObj } from '@storybook/react-vite';

import { MockAgentDecorator } from '../../../mock-agent.js';
import { ModelSelector } from '../../../../src/conversation/input/model-selector/selector.js';

const meta = {
	title: 'Conversation/ModelSelector',
	component: ModelSelector,
	decorators: [
		(Story) => (
			<MockAgentDecorator provider="anthropic" model="claude-sonnet-4-6">
				<div className="flex min-h-[500px] items-end p-4">
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
} satisfies Meta<typeof ModelSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OpenAICodex: Story = {
	decorators: [
		(Story) => (
			<MockAgentDecorator provider="openai-codex" model="gpt-5.4">
				<div className="flex min-h-[500px] items-end p-4">
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
};

export const OpenRouter: Story = {
	decorators: [
		(Story) => (
			<MockAgentDecorator provider="openrouter" model="z-ai/glm-5.1">
				<div className="flex min-h-[500px] items-end p-4">
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
};
