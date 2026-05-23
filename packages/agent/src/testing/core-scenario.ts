import type { Context, UserMessage, StreamEvent } from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import {
	createMockMiniACP,
	finishedTurn,
	type CreateMockMiniACPOptions,
	type MockMiniACP,
	type MockMiniACPRecording,
} from '@franklin/mini-acp/mock';
import {
	createCoreStateModule,
	type CoreStateModule,
} from '../modules/core/state-module.js';
import type { CoreRuntime } from '../modules/core/runtime/index.js';
import type { CoreState } from '../modules/core/state.js';
import type { InferExtension } from '../modules/state/index.js';
import { createRuntime } from './create-runtime.js';

export type CoreScenarioExtension = InferExtension<CoreStateModule>;

export type CoreScenarioInput = CreateMockMiniACPOptions & {
	readonly extensions?: readonly CoreScenarioExtension[];
	readonly state?: CoreState;
};

export type CoreScenarioPrompt = UserMessage | string;

export type CoreScenario = {
	readonly mock: MockMiniACP;
	readonly module: CoreStateModule;
	readonly runtime: CoreRuntime;
	collectPrompt(prompt?: CoreScenarioPrompt): Promise<StreamEvent[]>;
	state(): Promise<CoreState>;
	dispose(): Promise<void>;
};

export type CoreScenarioResult = {
	readonly events: StreamEvent[];
	readonly calls: MockMiniACPRecording;
	readonly context: Context;
	readonly state: CoreState;
};

export async function collectEvents<T>(
	iterable: AsyncIterable<T>,
): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iterable) items.push(item);
	return items;
}

export function defaultUserPrompt(): UserMessage {
	return createUserPrompt('hi');
}

function createUserPrompt(text: string): UserMessage {
	return {
		role: 'user',
		content: [{ type: 'text', text }],
	};
}

function resolveCoreScenarioPrompt(
	prompt: CoreScenarioPrompt = defaultUserPrompt(),
): UserMessage {
	return typeof prompt === 'string' ? createUserPrompt(prompt) : prompt;
}

export async function createCoreScenario(
	input: CoreScenarioInput = {},
): Promise<CoreScenario> {
	const mock = createMockMiniACP({
		turns: input.turns,
		defaultTurn: input.defaultTurn ?? finishedTurn(),
	});
	const module = createCoreStateModule(mock.connector);
	const runtime = await createRuntime(
		module,
		input.state ?? module.emptyState(),
		[...(input.extensions ?? [])],
	);

	return {
		mock,
		module,
		runtime,
		collectPrompt(prompt = defaultUserPrompt()) {
			return collectEvents(runtime.prompt(resolveCoreScenarioPrompt(prompt)));
		},
		state() {
			return module.state(runtime).get();
		},
		dispose() {
			return runtime.dispose();
		},
	};
}

export async function runCoreScenario(
	input: CoreScenarioInput & { readonly prompt?: CoreScenarioPrompt } = {},
): Promise<CoreScenarioResult> {
	const scenario = await createCoreScenario(input);
	try {
		const events = await scenario.collectPrompt(input.prompt);
		const state = await scenario.state();
		return {
			events,
			calls: scenario.mock.calls(),
			context: scenario.mock.context(),
			state,
		};
	} finally {
		await scenario.dispose();
	}
}

export function emptyCoreScenarioState(): CoreState {
	return {
		core: {
			messages: [],
			llmConfig: {},
			usage: ZERO_USAGE,
			toolFilter: { disabled: [] },
		},
	};
}
