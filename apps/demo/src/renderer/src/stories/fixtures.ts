import type { ConversationTurn } from '@franklin/extensions';
import type { UserMessage, AssistantMessage } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Individual messages
// ---------------------------------------------------------------------------

export const userTextMessage: UserMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'Hello, can you help me with something?' }],
};

export const assistantTextMessage: AssistantMessage = {
	role: 'assistant',
	content: [
		{
			type: 'text',
			text: "Of course! I'd be happy to help. What do you need?",
		},
	],
};

export const assistantThinkingMessage: AssistantMessage = {
	role: 'assistant',
	content: [
		{
			type: 'thinking',
			text: 'The user is asking for help. Let me consider what they might need...',
		},
		{ type: 'text', text: 'Sure, what can I help you with?' },
	],
};

export const assistantToolCallMessage: AssistantMessage = {
	role: 'assistant',
	content: [
		{ type: 'text', text: 'Let me look that up for you.' },
		{
			type: 'toolCall',
			id: 'tc_001',
			name: 'file_search',
			arguments: { query: 'readme' },
		},
		{ type: 'text', text: 'I found the file you were looking for.' },
	],
};

export const assistantMultiBlockMessage: AssistantMessage = {
	role: 'assistant',
	content: [
		{ type: 'thinking', text: 'Analyzing the request...' },
		{ type: 'text', text: 'Here is the first part of my answer.' },
		{ type: 'text', text: 'And here is the continuation.' },
		{
			type: 'toolCall',
			id: 'tc_002',
			name: 'run_tests',
			arguments: { suite: 'unit' },
		},
		{ type: 'thinking', text: 'Tests passed. Summarizing results...' },
		{ type: 'text', text: 'All 42 tests passed.' },
	],
};

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

export const singleTurn: ConversationTurn[] = [
	{
		id: 'turn-1',
		timestamp: Date.now(),
		messages: [userTextMessage, assistantTextMessage],
	},
];

export const multiTurn: ConversationTurn[] = [
	{
		id: 'turn-1',
		timestamp: Date.now() - 60_000,
		messages: [userTextMessage, assistantTextMessage],
	},
	{
		id: 'turn-2',
		timestamp: Date.now() - 30_000,
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'Can you search for the README file?' },
				],
			},
			assistantToolCallMessage,
		],
	},
	{
		id: 'turn-3',
		timestamp: Date.now(),
		messages: [
			{
				role: 'user',
				content: [{ type: 'text', text: 'Now run the tests please.' }],
			},
			assistantMultiBlockMessage,
		],
	},
];

export const thinkingTurn: ConversationTurn[] = [
	{
		id: 'turn-1',
		timestamp: Date.now(),
		messages: [
			{
				role: 'user',
				content: [{ type: 'text', text: 'What is the meaning of life?' }],
			},
			assistantThinkingMessage,
		],
	},
];

export const emptyConversation: ConversationTurn[] = [];
