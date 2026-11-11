import type { ToolExecuteParams, TurnStart } from '@franklin/mini-acp';
import type {
	EffectName,
	EffectValueForName,
	Registry,
} from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type {
	CoreAPI,
	CoreEventHandlers,
	CoreOnRegistration,
	CoreSignature,
} from '../api.js';
import type { ToolCallEvent } from '../handlers.js';
import { z } from 'zod';
import type { ToolHandlers } from '../tool.js';
import { toolSpec } from '../tool-spec.js';
import type { ToolSpec } from '../tool-spec.js';

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Expect<T extends true> = T;

type _CoreRegistryKeys = Expect<
	Equal<keyof Registry<CoreSignature, BaseRuntime>, 'effects'>
>;

type _CoreEffectNames = Expect<
	Equal<EffectName<CoreSignature, BaseRuntime>, 'on' | 'registerTool'>
>;

type _CoreRegistryOnEntries = Expect<
	Equal<
		EffectValueForName<CoreSignature, BaseRuntime, 'on'>,
		CoreOnRegistration<BaseRuntime>
	>
>;

type _CoreRegistryToolEntries = Expect<
	Equal<
		EffectValueForName<CoreSignature, BaseRuntime, 'registerTool'>,
		[spec: ToolSpec, handlers: ToolHandlers<ToolSpec, BaseRuntime>]
	>
>;

type _CoreTurnStartHandler = CoreEventHandlers<BaseRuntime>['turnStart'];
type _CoreToolCallHandler = CoreEventHandlers<BaseRuntime>['toolCall'];

const _turnStartHandler: _CoreTurnStartHandler = (event, runtime) => {
	const _event: TurnStart = event;
	const _runtime: BaseRuntime = runtime;
	void _event;
	void _runtime;
};

const _turnStartRegistration: CoreOnRegistration<BaseRuntime> = [
	'turnStart',
	_turnStartHandler,
];
void _turnStartRegistration;

const _toolCallHandler: _CoreToolCallHandler = (event, runtime) => {
	const _event: ToolCallEvent = event;
	const _params: ToolExecuteParams = event;
	const _runtime: BaseRuntime = runtime;
	void _event;
	void _params;
	void _runtime;
};

const _toolCallRegistration: CoreOnRegistration<BaseRuntime> = [
	'toolCall',
	_toolCallHandler,
];
void _toolCallRegistration;

const _api = null as unknown as CoreAPI<BaseRuntime>;
_api.on('turnStart', (event, runtime) => {
	const _event: TurnStart = event;
	const _runtime: BaseRuntime = runtime;
	void _event;
	void _runtime;
});

const _toolSpec = toolSpec<'countTool', { value: number }, { count: number }>(
	'countTool',
	'Counts',
	z.object({ value: z.number() }),
);

_api.registerTool(_toolSpec, {
	execute: ({ value }) => ({ count: value }),
	render: (output, args, runtime) => {
		const _output: { count: number } = output;
		const _args: { value: number } = args;
		const _runtime: BaseRuntime = runtime;
		void _output;
		void _args;
		void _runtime;
		return { content: [{ type: 'text', text: String(output.count) }] };
	},
});

// @ts-expect-error registerTool only accepts spec plus handlers.
_api.registerTool(_toolSpec, ({ value }) => ({ count: value }));

// @ts-expect-error inline tool definitions are no longer a registerTool form.
_api.registerTool({
	name: 'inlineTool',
	description: 'Inline',
	schema: z.object({}),
	execute: () => 'ok',
});
