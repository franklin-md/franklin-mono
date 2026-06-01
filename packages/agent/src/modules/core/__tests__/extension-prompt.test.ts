import type {
	ContextPatch,
	TextContent,
	UserMessage,
} from '@franklin/mini-acp';
import { priority, type BaseRuntime } from '@franklin/extensibility';
import { describe, expect, it } from 'vitest';
import { createCoreScenario, runCoreScenario } from '../../../testing/index.js';
import type { CoreAPI } from '../api/api.js';

function textContent(message: UserMessage | undefined): TextContent[] {
	return (message?.content ?? []).filter(
		(content): content is TextContent => content.type === 'text',
	);
}

function nonEmptySystemPromptPatches(
	patches: readonly ContextPatch[],
): string[] {
	return patches.flatMap((patch) =>
		patch.systemPrompt === undefined || patch.systemPrompt === ''
			? []
			: [patch.systemPrompt],
	);
}

describe('core extension prompt handlers', () => {
	it('appends content before the prompt reaches the agent', async () => {
		const { calls } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						prompt.appendContent(' [injected]');
					});
				},
			],
			prompt: 'hello',
		});

		expect(
			textContent(calls.prompts[0]).map((content) => content.text),
		).toEqual(['hello [injected]']);
	});

	it('composes multiple prompt handlers against the original request', async () => {
		const callsSeen: string[] = [];
		const inputsSeen: string[] = [];

		const result = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						callsSeen.push('first');
						inputsSeen.push(textContent(prompt.request)[0]?.text ?? '');
						prompt.appendContent(' first');
					});
					api.on('prompt', (prompt) => {
						callsSeen.push('second');
						inputsSeen.push(textContent(prompt.request)[0]?.text ?? '');
						prompt.appendContent(' second');
					});
				},
			],
			prompt: 'original',
		});

		expect(callsSeen).toEqual(['first', 'second']);
		expect(inputsSeen).toEqual(['original', 'original']);
		expect(
			textContent(result.calls.prompts[0]).map((content) => content.text),
		).toEqual(['original first second']);
	});

	it('edits the current prompt content structurally', async () => {
		const { calls } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						prompt.editContent((content) =>
							content.flatMap((item) =>
								item.type === 'text' && item.text === 'remove' ? [] : [item],
							),
						);
					});
				},
			],
			prompt: {
				role: 'user',
				content: [
					{ type: 'text', text: 'keep' },
					{ type: 'text', text: 'remove' },
					{ type: 'text', text: 'also keep' },
				],
			},
		});

		expect(
			textContent(calls.prompts[0]).map((content) => content.text),
		).toEqual(['keep', 'also keep']);
	});

	it('lets editContent add blocks while appendContent only touches the first text block', async () => {
		const image = {
			type: 'image' as const,
			data: 'base64',
			mimeType: 'image/png',
		};

		const { calls } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						prompt.editContent((content) => [
							...content,
							{ type: 'text', text: 'tail' },
						]);
						prompt.appendContent(' after');
					});
				},
			],
			prompt: {
				role: 'user',
				content: [{ type: 'text', text: 'head' }, image],
			},
		});

		expect(calls.prompts[0]?.content).toEqual([
			{ type: 'text', text: 'head after' },
			image,
			{ type: 'text', text: 'tail' },
		]);
	});

	it('lets editContent insert blocks before the submitted content', async () => {
		const image = {
			type: 'image' as const,
			data: 'base64',
			mimeType: 'image/png',
		};

		const { calls } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						prompt.editContent((content) => [
							{ type: 'text', text: 'before' },
							...content,
						]);
					});
				},
			],
			prompt: {
				role: 'user',
				content: [image],
			},
		});

		expect(calls.prompts[0]?.content).toEqual([
			{ type: 'text', text: 'before' },
			image,
		]);
	});

	it('passes the original prompt through when a handler only observes it', async () => {
		let observed: Readonly<UserMessage> | undefined;

		const { calls } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						observed = prompt.request;
					});
				},
			],
			prompt: 'hello',
		});

		expect(textContent(observed).map((content) => content.text)).toEqual([
			'hello',
		]);
		expect(
			textContent(calls.prompts[0]).map((content) => content.text),
		).toEqual(['hello']);
	});

	it('keeps request as the original prompt after content edits', async () => {
		let observed: Readonly<UserMessage> | undefined;

		const { calls } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						prompt.editContent(() => [{ type: 'text', text: 'edited' }]);
						observed = prompt.request;
					});
				},
			],
			prompt: 'original',
		});

		expect(textContent(observed).map((content) => content.text)).toEqual([
			'original',
		]);
		expect(
			textContent(calls.prompts[0]).map((content) => content.text),
		).toEqual(['edited']);
	});

	it('copies content returned by editContent before sending the prompt', async () => {
		const returned = [{ type: 'text' as const, text: 'stable' }];

		const { calls } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						prompt.editContent(() => returned);
						returned.push({ type: 'text', text: 'late mutation' });
					});
				},
			],
		});

		expect(
			textContent(calls.prompts[0]).map((content) => content.text),
		).toEqual(['stable']);
	});
});

describe('core extension system prompt handlers', () => {
	it('assembles the system prompt before the first turn reaches the agent', async () => {
		const { context } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('Tool guidelines here.');
					});
				},
			],
		});

		expect(context.systemPrompt).toBe('Tool guidelines here.');
	});

	it('composes multiple system prompt handlers in registration order', async () => {
		const { context } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('first');
					});
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('second');
					});
				},
			],
		});

		expect(context.systemPrompt).toBe('first\n\nsecond');
	});

	it('composes system prompt handlers in priority order', async () => {
		const { context } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('normal');
					});
				},
				priority.high((prioritizedApi: CoreAPI<BaseRuntime>) => {
					prioritizedApi.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('high');
					});
				}),
				priority.low((prioritizedApi: CoreAPI<BaseRuntime>) => {
					prioritizedApi.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('low');
					});
				}),
			],
		});

		expect(context.systemPrompt).toBe('high\n\nnormal\n\nlow');
	});

	it('does not resend the system prompt when handlers produce the same result', async () => {
		const scenario = await createCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('stable');
					});
				},
			],
		});

		try {
			await scenario.collectPrompt('first');
			await scenario.collectPrompt('second');

			expect(
				nonEmptySystemPromptPatches(scenario.mock.calls().setContext),
			).toEqual(['stable']);
		} finally {
			await scenario.dispose();
		}
	});

	it('sends a new system prompt patch when a handler changes its fragment', async () => {
		let value = 'v1';
		const scenario = await createCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart(value);
					});
				},
			],
		});

		try {
			await scenario.collectPrompt('first');
			value = 'v2';
			await scenario.collectPrompt('second');

			expect(
				nonEmptySystemPromptPatches(scenario.mock.calls().setContext),
			).toEqual(['v1', 'v2']);
			expect(scenario.mock.context().systemPrompt).toBe('v2');
		} finally {
			await scenario.dispose();
		}
	});

	it('keeps a previous fragment when a later turn does not set it again', async () => {
		let turn = 0;
		const scenario = await createCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						if (turn === 0) systemPrompt.setPart('sticky');
					});
				},
			],
		});

		try {
			await scenario.collectPrompt('first');
			turn = 1;
			await scenario.collectPrompt('second');

			expect(
				nonEmptySystemPromptPatches(scenario.mock.calls().setContext),
			).toEqual(['sticky']);
			expect(scenario.mock.context().systemPrompt).toBe('sticky');
		} finally {
			await scenario.dispose();
		}
	});

	it('excludes handlers that never set a system prompt part', async () => {
		const { context } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						void systemPrompt;
					});
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('present');
					});
				},
			],
		});

		expect(context.systemPrompt).toBe('present');
	});

	it('awaits async system prompt handlers before prompting the agent', async () => {
		const { context } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', async (systemPrompt) => {
						await Promise.resolve();
						systemPrompt.setPart('async-value');
					});
				},
			],
		});

		expect(context.systemPrompt).toBe('async-value');
	});

	it('applies system prompt and user prompt handlers in one turn', async () => {
		const { calls, context } = await runCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart('system');
					});
					api.on('prompt', (prompt) => {
						prompt.appendContent(' [injected]');
					});
				},
			],
			prompt: 'hello',
		});

		expect(context.systemPrompt).toBe('system');
		expect(
			textContent(calls.prompts[0]).map((content) => content.text),
		).toEqual(['hello [injected]']);
	});

	it('updates a changed system prompt with a context patch instead of resending messages', async () => {
		let value = 'initial';
		const scenario = await createCoreScenario({
			extensions: [
				(api) => {
					api.on('systemPrompt', (systemPrompt) => {
						systemPrompt.setPart(value);
					});
				},
			],
		});

		try {
			await scenario.collectPrompt();
			value = 'dynamic';
			await scenario.collectPrompt();

			const promptPatch = scenario.mock
				.calls()
				.setContext.find((patch) => patch.systemPrompt === 'dynamic');
			expect(promptPatch).toEqual({
				systemPrompt: 'dynamic',
			});
		} finally {
			await scenario.dispose();
		}
	});
});
