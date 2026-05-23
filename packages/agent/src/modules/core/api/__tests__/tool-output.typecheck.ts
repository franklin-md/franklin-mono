import type { JsonValue } from '@franklin/lib';
import { z } from 'zod';

import type { ToolResultEvent } from '../handlers.js';
import type { RenderedToolOutput } from '../tool.js';
import type { ToolOutputOf, ToolSpec } from '../tool-spec.js';
import { defaultToolRenderOutput } from '../tool.js';
import { toolSpec } from '../tool-spec.js';

type ExpectJson<T extends JsonValue> = T;

const _defaultSpec = toolSpec(
	'default_output',
	'Uses the default JSON output boundary',
	z.object({}),
);
type _DefaultOutput = ExpectJson<ToolOutputOf<typeof _defaultSpec>>;

type _StructuredOutput = ExpectJson<{ count: number; labels: string[] }>;
type _RenderedOutput = ExpectJson<RenderedToolOutput>;

const _resultEvent = {
	call: {
		type: 'toolCall',
		id: 'call-1',
		name: 'count',
		arguments: {},
	},
	result: { content: [{ type: 'text', text: 'count:1' }] },
	output: { count: 1, labels: ['a'] },
} satisfies ToolResultEvent<_StructuredOutput>;

// @ts-expect-error raw tool output must be JSON-serializable.
type _DateOutputSpec = ToolSpec<'bad', Record<string, never>, Date>;

// @ts-expect-error raw tool result events must carry JSON output.
type _DateOutputEvent = ToolResultEvent<Date>;

// @ts-expect-error default rendering only accepts JSON or rendered tool output.
defaultToolRenderOutput(new Date());

void _defaultSpec;
void _resultEvent;
void (null as unknown as _RenderedOutput);
