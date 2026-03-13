import type { Meta, StoryObj } from '@storybook/react-vite';

import { MessageBubble } from '@/components/conversation/message-bubble';

const meta = {
	title: 'Conversation/MessageBubble',
	component: MessageBubble,
	parameters: { layout: 'padded' },
	decorators: [
		(Story) => (
			<div className="mx-auto max-w-2xl space-y-4 p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof MessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserMessage: Story = {
	args: {
		message: {
			id: 'u1',
			role: 'user',
			text: 'Can you help me refactor this function to use async/await?',
			isStreaming: false,
		},
	},
};

export const AssistantMessage: Story = {
	args: {
		message: {
			id: 'a1',
			role: 'assistant',
			text: "Sure! Here's the refactored version using `async/await`:\n\n```typescript\nasync function fetchData(url: string): Promise<Response> {\n  const response = await fetch(url);\n  if (!response.ok) {\n    throw new Error(`HTTP error: ${response.status}`);\n  }\n  return response;\n}\n```\n\nThe key changes are:\n1. Added `async` keyword to the function\n2. Replaced `.then()` chains with `await`\n3. Added proper error handling with `try/catch`",
			isStreaming: false,
		},
	},
};

export const AssistantStreaming: Story = {
	args: {
		message: {
			id: 'a2',
			role: 'assistant',
			text: 'Let me analyze the codebase to understand the',
			isStreaming: true,
		},
	},
};

export const Conversation: Story = {
	args: {
		message: {
			id: 'u1',
			role: 'user',
			text: 'What does the spawn function do?',
			isStreaming: false,
		},
	},
	render: () => (
		<div className="space-y-3">
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'What does the spawn function do?',
					isStreaming: false,
				}}
			/>
			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: 'The `spawn` function creates a new ACP agent subprocess with a configured middleware stack. It:\n\n1. Looks up the agent spec from the registry\n2. Creates a stdio transport to the subprocess\n3. Wraps it with middleware (history, modules, permissions)\n4. Returns an `AgentHandle` for interaction',
					isStreaming: false,
				}}
			/>
		</div>
	),
};
