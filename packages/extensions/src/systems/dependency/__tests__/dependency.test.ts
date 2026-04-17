import { describe, it, expect, expectTypeOf, vi } from 'vitest';
import { z } from 'zod';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import {
	createAgentConnection,
	createSessionAdapter,
	StopCode,
	type Update,
} from '@franklin/mini-acp';
import type { CoreAPI } from '../../../systems/core/api/api.js';
import { toolSpec } from '../../../systems/core/api/tool-spec.js';
import type { DependencyAPI as ApiIndexDependencyAPI } from '../../../index.js';
import { createCoreCompiler } from '../../../systems/core/compile/compiler.js';
import { compile } from '../../../algebra/compiler/compile.js';
import { combine } from '../../../algebra/compiler/combine.js';
import {
	createCoreSystem,
	createDependencySystem,
	createRuntime,
	systems,
	type DependencyAPI,
	type DependencySystem,
	type InferAPI,
} from '../../../index.js';
import { createDependencySystem as createDependencySystemFromRuntimeSystemIndex } from '../system.js';

function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();
		const connection = createAgentConnection(agentSide);

		const adapter = createSessionAdapter(
			(_ctx) => ({
				async *prompt() {
					yield {
						type: 'update' as const,
						messageId: 'm1',
						message: {
							role: 'assistant' as const,
							content: [{ type: 'text' as const, text: 'hello' }],
						},
					} satisfies Update;
					yield {
						type: 'turnEnd' as const,
						stopCode: StopCode.Finished,
					};
				},
				async cancel() {},
			}),
			connection.remote,
		);
		connection.bind(adapter);

		return {
			...clientSide,
			dispose: vi.fn(async () => {}),
		};
	};
}

describe('createDependencySystem', () => {
	it('is exported from the public surfaces', () => {
		const settings = { get: vi.fn(() => 'medium') };
		const system = createDependencySystemFromRuntimeSystemIndex(
			'Settings',
			settings,
		);

		expectTypeOf(system).toEqualTypeOf<
			DependencySystem<'Settings', typeof settings>
		>();
		expectTypeOf<
			ApiIndexDependencyAPI<'Settings', typeof settings>
		>().toEqualTypeOf<DependencyAPI<'Settings', typeof settings>>();
	});

	it('extensions can access the dependency via the generated getter', async () => {
		const settings = { get: vi.fn(() => 'medium') };
		const system = createDependencySystem('Settings', settings);

		let received: typeof settings | undefined;
		const runtime = await createRuntime(system, {}, [
			(api) => {
				received = api.getSettings();
			},
		]);

		expect(received).toBe(settings);
		expect(await runtime.state()).toEqual({});
		expect(await runtime.fork()).toEqual({});
		expect(await runtime.child()).toEqual({});

		const unsubscribe = runtime.subscribe(() => {});
		unsubscribe();
		await runtime.dispose();
	});

	it('lets extensions capture the dependency and use it in registered tools', async () => {
		const settings = {
			get: vi.fn((key: string) => (key === 'reasoning' ? 'medium' : 'unset')),
		};
		const dependencyCompiler = await createDependencySystem(
			'Settings',
			settings,
		).createCompiler({});
		const compiler = combine(createCoreCompiler(), dependencyCompiler);
		const spec = toolSpec(
			'read_setting',
			'Read a setting',
			z.object({ key: z.string() }),
		);

		const result = await compile(compiler, (api) => {
			const capturedSettings = api.getSettings();
			api.registerTool(spec, ({ key }) => ({
				content: [{ type: 'text' as const, text: capturedSettings.get(key) }],
			}));
		});

		const next = vi.fn();
		const toolResult = await result.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'call-1',
					name: 'read_setting',
					arguments: { key: 'reasoning' },
				},
			},
			next,
		);

		expect(settings.get).toHaveBeenCalledWith('reasoning');
		expect(toolResult.toolCallId).toBe('call-1');
		expect(toolResult.content[0]).toEqual({
			type: 'text',
			text: 'medium',
		});
		expect(next).not.toHaveBeenCalled();
	});

	it('composes with systems() without adding persisted state', async () => {
		const settings = { get: vi.fn(() => 'medium') };
		const system = systems(createCoreSystem(createMockSpawn()))
			.add(createDependencySystem('Settings', settings))
			.done();

		type ActualAPI = InferAPI<typeof system>;
		type ExpectedAPI = CoreAPI & DependencyAPI<'Settings', typeof settings>;

		const actualExtendsExpected: ExpectedAPI = {} as ActualAPI;
		const expectedExtendsActual: ActualAPI = {} as ExpectedAPI;
		expect(actualExtendsExpected).toBeDefined();
		expect(expectedExtendsActual).toBeDefined();

		const runtime = await createRuntime(
			system,
			{ core: { messages: [], llmConfig: {} } },
			[
				(api) => {
					expect(api.getSettings()).toBe(settings);
				},
			],
		);

		expect(await runtime.state()).toEqual({
			core: { messages: [], llmConfig: {} },
		});
		expect(await runtime.fork()).toEqual({
			core: { messages: [], llmConfig: {} },
		});
		expect(await runtime.child()).toEqual({
			core: { messages: [], llmConfig: {} },
		});

		await runtime.dispose();
	});
});
