import type { JsonValue } from '@franklin/lib';
import type { ConversationTurn, ToolUseBlock } from '../types.js';

type ExpectJson<T extends JsonValue> = T;
type _DefaultToolOutput = ExpectJson<NonNullable<ToolUseBlock['output']>>;
type _ConversationTurnIsJson = ExpectJson<ConversationTurn>;

const _toolUseBlock = {
	kind: 'toolUse',
	call: {
		type: 'toolCall',
		id: 'call-1',
		name: 'grep',
		arguments: {
			pattern: 'JsonValue',
		},
	},
	output: {
		count: 1,
		files: ['src/a.ts'],
	},
	startedAt: 0,
} satisfies ToolUseBlock;

const _json: JsonValue = _toolUseBlock;

const _conversationTurn = {
	id: 'turn-1',
	timestamp: 1,
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Check JSON shape' }],
	},
	response: {
		blocks: [_toolUseBlock],
	},
} satisfies ConversationTurn;

const _conversationJson: JsonValue = _conversationTurn;

const _dateOutput = {
	kind: 'toolUse',
	call: {
		type: 'toolCall',
		id: 'call-2',
		name: 'bad',
		arguments: {},
	},
	// @ts-expect-error persisted raw tool output must be JSON.
	output: new Date(),
	startedAt: 0,
} satisfies ToolUseBlock;

void (null as unknown as _DefaultToolOutput);
void (null as unknown as _ConversationTurnIsJson);
void _json;
void _conversationJson;
void _dateOutput;
