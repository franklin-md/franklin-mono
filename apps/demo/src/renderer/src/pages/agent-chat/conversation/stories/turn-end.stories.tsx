import type { Meta, StoryObj } from '@storybook/react-vite';

import { AssistantBubble } from '../turn/body/assistant-bubble.js';
import {
	assistantFinishedResponse,
	assistantCancelledResponse,
	assistantMaxTokensResponse,
	assistantConfigErrorResponse,
	assistantProviderErrorResponse,
	assistantGenericErrorResponse,
} from '../fixtures.js';

const meta = {
	title: 'Conversation/TurnEnd',
	component: AssistantBubble,
} satisfies Meta<typeof AssistantBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Finished: Story = {
	args: { response: assistantFinishedResponse },
};

export const Cancelled: Story = {
	args: { response: assistantCancelledResponse },
};

export const MaxTokens: Story = {
	args: { response: assistantMaxTokensResponse },
};

export const ConfigError: Story = {
	args: { response: assistantConfigErrorResponse },
};

export const ProviderError: Story = {
	args: { response: assistantProviderErrorResponse },
};

export const GenericError: Story = {
	args: { response: assistantGenericErrorResponse },
};
