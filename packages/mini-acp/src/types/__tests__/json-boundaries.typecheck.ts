import type { JsonObject } from '@franklin/lib';
import type { ToolCallContent } from '../content.js';
import type { ToolDefinition } from '../tool.js';

type ExpectJsonObject<T extends JsonObject> = T;
type _ToolArgumentsAreJson = ExpectJsonObject<ToolCallContent['arguments']>;
type _ToolSchemaIsJson = ExpectJsonObject<ToolDefinition['inputSchema']>;

const _toolCall = {
	type: 'toolCall',
	id: 'call-1',
	name: 'read_file',
	arguments: {
		path: '/tmp/a.txt',
		options: { lineNumbers: true },
	},
} satisfies ToolCallContent;

const _toolDefinition = {
	name: 'read_file',
	description: 'Read a file',
	inputSchema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
		},
		required: ['path'],
	},
} satisfies ToolDefinition;

const _dateArguments = {
	type: 'toolCall',
	id: 'call-2',
	name: 'bad',
	arguments: {
		// @ts-expect-error tool call arguments must be JSON values.
		at: new Date(),
	},
} satisfies ToolCallContent;

const _dateSchema = {
	name: 'bad',
	description: 'Bad schema',
	inputSchema: {
		// @ts-expect-error tool input schemas must be JSON values.
		createdAt: new Date(),
	},
} satisfies ToolDefinition;

void (null as unknown as _ToolArgumentsAreJson);
void (null as unknown as _ToolSchemaIsJson);
void _toolCall;
void _toolDefinition;
void _dateArguments;
void _dateSchema;
