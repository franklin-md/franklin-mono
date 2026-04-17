import { describe, it, expect } from 'vitest';
import { buildSystemPromptAssembler } from '../system-prompt.js';
import type { SystemPromptHandler } from '../../../api/handlers.js';

describe('buildSystemPromptAssembler', () => {
	it('returns just the base prompt when no handlers are registered', async () => {
		const assembler = buildSystemPromptAssembler([], 'base');
		expect(await assembler.assemble()).toBe('base');
	});

	it('omits the base prompt entirely when it is empty', async () => {
		const assembler = buildSystemPromptAssembler(
			[(ctx) => ctx.setPart('only')],
			'',
		);
		expect(await assembler.assemble()).toBe('only');
	});

	it('concatenates fragments in handler registration order', async () => {
		const assembler = buildSystemPromptAssembler(
			[
				(ctx) => ctx.setPart('first'),
				(ctx) => ctx.setPart('second'),
				(ctx) => ctx.setPart('third'),
			],
			'base',
		);
		expect(await assembler.assemble()).toBe('base\n\nfirst\n\nsecond\n\nthird');
	});

	it('skips handlers that never call setPart', async () => {
		const assembler = buildSystemPromptAssembler(
			[
				(ctx) => ctx.setPart('a'),
				() => {
					/* no setPart */
				},
				(ctx) => ctx.setPart('c'),
			],
			'base',
		);
		expect(await assembler.assemble()).toBe('base\n\na\n\nc');
	});

	it('persists a fragment across turns when the handler does not set it again', async () => {
		let turn = 0;
		const handler: SystemPromptHandler = (ctx) => {
			if (turn === 0) ctx.setPart('sticky');
			// subsequent turns: no setPart
		};
		const assembler = buildSystemPromptAssembler([handler], 'base');

		expect(await assembler.assemble()).toBe('base\n\nsticky');
		turn = 1;
		expect(await assembler.assemble()).toBe('base\n\nsticky');
	});

	it('replaces a fragment when the handler calls setPart again', async () => {
		let turn = 0;
		const handler: SystemPromptHandler = (ctx) => {
			ctx.setPart(turn === 0 ? 'v1' : 'v2');
		};
		const assembler = buildSystemPromptAssembler([handler], 'base');

		expect(await assembler.assemble()).toBe('base\n\nv1');
		turn = 1;
		expect(await assembler.assemble()).toBe('base\n\nv2');
	});

	it('clears a fragment when setPart is called with an empty string', async () => {
		let turn = 0;
		const handler: SystemPromptHandler = (ctx) => {
			ctx.setPart(turn === 0 ? 'visible' : '');
		};
		const assembler = buildSystemPromptAssembler([handler], 'base');

		expect(await assembler.assemble()).toBe('base\n\nvisible');
		turn = 1;
		expect(await assembler.assemble()).toBe('base');
	});

	it('awaits async handlers in order', async () => {
		const order: string[] = [];
		const assembler = buildSystemPromptAssembler(
			[
				async (ctx) => {
					await Promise.resolve();
					order.push('a');
					ctx.setPart('a');
				},
				async (ctx) => {
					await Promise.resolve();
					order.push('b');
					ctx.setPart('b');
				},
			],
			'',
		);

		expect(await assembler.assemble()).toBe('a\n\nb');
		expect(order).toEqual(['a', 'b']);
	});

	it('keeps fragment slots independent — handler A unset does not clobber handler B', async () => {
		let turn = 0;
		const assembler = buildSystemPromptAssembler(
			[
				(ctx) => {
					if (turn === 0) ctx.setPart('A');
				},
				(ctx) => {
					ctx.setPart(turn === 0 ? 'B1' : 'B2');
				},
			],
			'base',
		);

		expect(await assembler.assemble()).toBe('base\n\nA\n\nB1');
		turn = 1;
		expect(await assembler.assemble()).toBe('base\n\nA\n\nB2');
	});
});
