import type { AssistantTurn, ConversationTurn } from '@franklin/extensions';
import { StopCode, type UserMessage } from '@franklin/mini-acp';

export const userTextPrompt: UserMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'Hello, can you help me with something?' }],
};

const assistantTextResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'text',
			text: "Of course. Tell me what you're working on.",
		},
	],
};

const assistantThinkingResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'thinking',
			text: 'I should give a compact answer first, then offer a concrete next step.',
		},
		{
			kind: 'text',
			text: 'Sure. What part do you want to focus on first?',
		},
	],
};

const assistantToolResponse: AssistantTurn = {
	blocks: [
		{ kind: 'text', text: 'I checked the repo structure first.' },
		{
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tool-1',
				name: 'search_files',
				arguments: { pattern: 'README.md' },
			},
			result: [{ type: 'text', text: 'Found 3 matching files.' }],
		},
		{
			kind: 'text',
			text: 'The shared package already has the pieces we need.',
		},
	],
};

const assistantMarkdownResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'text',
			text: `I reviewed the UI layer and there are three things worth noting.

## Architecture

1. The shared components live in a package with direct Tailwind class usage.
2. Runtime-aware controls depend on \`@franklin/react\` hooks.
3. Theme variables are app-owned today, which is why Storybook currently duplicates CSS.

### Code Sample

\`\`\`ts
export function withRetry<T>(fn: () => Promise<T>, attempts = 3) {
  return fn();
}
\`\`\`

### Math

The balance target is roughly:

$$
P(key \\to bucket) = \\frac{1}{n}
$$

| Layer | Role |
| --- | --- |
| UI | Render primitives |
| React hooks | Bind runtime state |
| Theme CSS | Provide semantic tokens |
`,
		},
	],
};

export const emptyConversation: ConversationTurn[] = [];

export const singleTurnSequence: ConversationTurn[] = [
	{
		id: 'turn-1',
		timestamp: Date.now() - 90_000,
		prompt: userTextPrompt,
		response: assistantTextResponse,
	},
];

export const multiTurn: ConversationTurn[] = [
	{
		id: 'turn-1',
		timestamp: Date.now() - 180_000,
		prompt: userTextPrompt,
		response: assistantTextResponse,
	},
	{
		id: 'turn-2',
		timestamp: Date.now() - 120_000,
		prompt: {
			role: 'user',
			content: [
				{ type: 'text', text: 'Can you look for the Storybook setup?' },
			],
		},
		response: assistantToolResponse,
	},
	{
		id: 'turn-3',
		timestamp: Date.now() - 60_000,
		prompt: {
			role: 'user',
			content: [{ type: 'text', text: 'Summarize the implementation plan.' }],
		},
		response: assistantThinkingResponse,
	},
];

export const thinkingTurnSequence: ConversationTurn[] = [
	{
		id: 'turn-thinking',
		timestamp: Date.now() - 30_000,
		prompt: {
			role: 'user',
			content: [{ type: 'text', text: 'What is the right tradeoff here?' }],
		},
		response: assistantThinkingResponse,
	},
];

export const markdownConversation: ConversationTurn[] = [
	{
		id: 'turn-md',
		timestamp: Date.now() - 10_000,
		prompt: {
			role: 'user',
			content: [
				{
					type: 'text',
					text: 'Explain the architecture and show enough formatting to stress the renderer.',
				},
			],
		},
		response: assistantMarkdownResponse,
	},
];

export const finishedTurn: ConversationTurn = {
	id: 'turn-finished',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Wrap it up.' }],
	},
	response: {
		blocks: [
			{ kind: 'text', text: 'Done. The work is complete.' },
			{ kind: 'turnEnd', stopCode: StopCode.Finished },
		],
	},
};

export const cancelledTurn: ConversationTurn = {
	id: 'turn-cancelled',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Stop there.' }],
	},
	response: {
		blocks: [
			{ kind: 'text', text: 'Stopping now.' },
			{ kind: 'turnEnd', stopCode: StopCode.Cancelled },
		],
	},
};

export const maxTokensTurn: ConversationTurn = {
	id: 'turn-max-tokens',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Explain everything in full detail.' }],
	},
	response: {
		blocks: [
			{
				kind: 'text',
				text: 'The system is layered across transport, protocol, runtime, and UI boundaries, and the response is truncated here to demonstrate token exhaustion.',
			},
			{ kind: 'turnEnd', stopCode: StopCode.MaxTokens },
		],
	},
};

export const configErrorTurn: ConversationTurn = {
	id: 'turn-config-error',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Use the configured provider.' }],
	},
	response: {
		blocks: [
			{
				kind: 'turnEnd',
				stopCode: StopCode.ProviderNotSpecified,
				stopMessage: 'No provider specified in config.',
			},
		],
	},
};

export const providerErrorTurn: ConversationTurn = {
	id: 'turn-provider-error',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Tell me a joke.' }],
	},
	response: {
		blocks: [
			{
				kind: 'turnEnd',
				stopCode: StopCode.ProviderError,
				stopMessage: 'Anthropic API returned 529: overloaded.',
			},
		],
	},
};

export const genericErrorTurn: ConversationTurn = {
	id: 'turn-generic-error',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Help me debug this.' }],
	},
	response: {
		blocks: [
			{
				kind: 'turnEnd',
				stopCode: StopCode.LlmError,
			},
		],
	},
};
