import type { JsonValue } from '@franklin/lib';
import type { ToolUseBlock } from '../types.js';

type ExpectJson<T extends JsonValue> = T;
type _DefaultToolOutput = ExpectJson<NonNullable<ToolUseBlock['output']>>;

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
void _json;
void _dateOutput;
