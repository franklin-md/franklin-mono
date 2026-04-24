import { describe, it, expect } from 'vitest';
import { buildSystemPromptAssembler } from '../assembler/index.js';
import type { SystemPromptHandler } from '../../../../api/handlers.js';

describe('buildSystemPromptAssembler', () => {
	it('returns an empty prompt when no handlers are registered', async () => {
		const assembler = buildSystemPromptAssembler([]);
		expect(await assembler.assemble()).toBe('');
	});

	it('returns the handler fragment when only one handler contributes', async () => {
		const assembler = buildSystemPromptAssembler([
			(ctx) => ctx.setPart('only'),
		]);
		expect(await assembler.assemble()).toBe('only');
	});

	it('concatenates fragments in handler registration order', async () => {
		const assembler = buildSystemPromptAssembler([
			(ctx) => ctx.setPart('first'),
			(ctx) => ctx.setPart('second'),
			(ctx) => ctx.setPart('third'),
		]);
		expect(await assembler.assemble()).toBe('first\n\nsecond\n\nthird');
	});

	it('skips handlers that never call setPart', async () => {
		const assembler = buildSystemPromptAssembler([
			(ctx) => ctx.setPart('a'),
			() => {
				/* no setPart */
			},
			(ctx) => ctx.setPart('c'),
		]);
		expect(await assembler.assemble()).toBe('a\n\nc');
	});

	it('persists a fragment across turns when the handler does not set it again', async () => {
		let turn = 0;
		const handler: SystemPromptHandler = (ctx) => {
			if (turn === 0) ctx.setPart('sticky');
			// subsequent turns: no setPart
		};
		const assembler = buildSystemPromptAssembler([handler]);

		expect(await assembler.assemble()).toBe('sticky');
		turn = 1;
		expect(await assembler.assemble()).toBe('sticky');
	});

	it('replaces a fragment when the handler calls setPart again', async () => {
		let turn = 0;
		const handler: SystemPromptHandler = (ctx) => {
			ctx.setPart(turn === 0 ? 'v1' : 'v2');
		};
		const assembler = buildSystemPromptAssembler([handler]);

		expect(await assembler.assemble()).toBe('v1');
		turn = 1;
		expect(await assembler.assemble()).toBe('v2');
	});

	it('clears a fragment when setPart is called with an empty string', async () => {
		let turn = 0;
		const handler: SystemPromptHandler = (ctx) => {
			ctx.setPart(turn === 0 ? 'visible' : '');
		};
		const assembler = buildSystemPromptAssembler([handler]);

		expect(await assembler.assemble()).toBe('visible');
		turn = 1;
		expect(await assembler.assemble()).toBe('');
	});

	it('awaits async handlers in order', async () => {
		const order: string[] = [];
		const assembler = buildSystemPromptAssembler([
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
		]);

		expect(await assembler.assemble()).toBe('a\n\nb');
		expect(order).toEqual(['a', 'b']);
	});

	it('keeps fragment slots independent — handler A unset does not clobber handler B', async () => {
		let turn = 0;
		const assembler = buildSystemPromptAssembler([
			(ctx) => {
				if (turn === 0) ctx.setPart('A');
			},
			(ctx) => {
				ctx.setPart(turn === 0 ? 'B1' : 'B2');
			},
		]);

		expect(await assembler.assemble()).toBe('A\n\nB1');
		turn = 1;
		expect(await assembler.assemble()).toBe('A\n\nB2');
	});

	describe('cache bucketing', () => {
		it('places cache:true fragments before non-cache fragments regardless of registration order', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('volatile'),
				(ctx) => ctx.setPart('stable', { cache: true }),
			]);
			expect(await assembler.assemble()).toBe('stable\n\nvolatile');
		});

		it('preserves registration order within the cache bucket', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('stable-1', { cache: true }),
				(ctx) => ctx.setPart('volatile'),
				(ctx) => ctx.setPart('stable-2', { cache: true }),
			]);
			expect(await assembler.assemble()).toBe(
				'stable-1\n\nstable-2\n\nvolatile',
			);
		});

		it('preserves registration order within the non-cache bucket', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('v1'),
				(ctx) => ctx.setPart('stable', { cache: true }),
				(ctx) => ctx.setPart('v2'),
			]);
			expect(await assembler.assemble()).toBe('stable\n\nv1\n\nv2');
		});

		it('treats setPart with no opts as non-cache (back-compat)', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('a', { cache: true }),
				(ctx) => ctx.setPart('b'),
			]);
			expect(await assembler.assemble()).toBe('a\n\nb');
		});

		it('treats { cache: false } as non-cache', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('a'),
				(ctx) => ctx.setPart('b', { cache: false }),
				(ctx) => ctx.setPart('c', { cache: true }),
			]);
			expect(await assembler.assemble()).toBe('c\n\na\n\nb');
		});

		it('updates the cache flag on subsequent setPart calls', async () => {
			let turn = 0;
			const handler: SystemPromptHandler = (ctx) => {
				if (turn === 0) ctx.setPart('x', { cache: true });
				else ctx.setPart('x', { cache: false });
			};
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('z', { cache: true }),
				handler,
				(ctx) => ctx.setPart('y'),
			]);

			// turn 0: cache=[z, x], uncached=[y]
			expect(await assembler.assemble()).toBe('z\n\nx\n\ny');
			turn = 1;
			// turn 1: x demoted to non-cache, registration order preserved
			// cache=[z], uncached=[x, y]
			expect(await assembler.assemble()).toBe('z\n\nx\n\ny');
		});
	});

	describe('once semantics', () => {
		it('pins the fragment for the life of the session', async () => {
			let turn = 0;
			const handler: SystemPromptHandler = (ctx) => {
				if (turn === 0) ctx.setPart('pinned', { once: true });
				else ctx.setPart('replacement');
			};
			const assembler = buildSystemPromptAssembler([handler]);

			expect(await assembler.assemble()).toBe('pinned');
			turn = 1;
			expect(await assembler.assemble()).toBe('pinned');
			turn = 2;
			expect(await assembler.assemble()).toBe('pinned');
		});

		it('ignores setPart("") on a pinned slot (does not clear)', async () => {
			let turn = 0;
			const handler: SystemPromptHandler = (ctx) => {
				if (turn === 0) ctx.setPart('pinned', { once: true });
				else ctx.setPart('');
			};
			const assembler = buildSystemPromptAssembler([handler]);

			expect(await assembler.assemble()).toBe('pinned');
			turn = 1;
			expect(await assembler.assemble()).toBe('pinned');
		});

		it('defaults cache to true when once is true and cache is unspecified', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('volatile'),
				(ctx) => ctx.setPart('once-pinned', { once: true }),
			]);
			// once-pinned is in cache bucket by default, so it comes first
			expect(await assembler.assemble()).toBe('once-pinned\n\nvolatile');
		});

		it('honors explicit { once: true, cache: false }', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('stable', { cache: true }),
				(ctx) =>
					ctx.setPart('uncached-but-pinned', {
						once: true,
						cache: false,
					}),
				(ctx) => ctx.setPart('volatile'),
			]);
			// cache bucket: [stable]; non-cache: [uncached-but-pinned, volatile]
			expect(await assembler.assemble()).toBe(
				'stable\n\nuncached-but-pinned\n\nvolatile',
			);
		});

		it('honors explicit { once: true, cache: true } the same as default', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('v'),
				(ctx) => ctx.setPart('pinned', { once: true, cache: true }),
			]);
			expect(await assembler.assemble()).toBe('pinned\n\nv');
		});

		it('pins on the first call only — later { once: true } calls are no-ops like any other', async () => {
			let turn = 0;
			const handler: SystemPromptHandler = (ctx) => {
				if (turn === 0) ctx.setPart('first', { once: true });
				else ctx.setPart('second', { once: true });
			};
			const assembler = buildSystemPromptAssembler([handler]);

			expect(await assembler.assemble()).toBe('first');
			turn = 1;
			expect(await assembler.assemble()).toBe('first');
		});

		it('skips a pinned handler on subsequent assembles (no re-invocation)', async () => {
			let invocations = 0;
			const handler: SystemPromptHandler = (ctx) => {
				invocations += 1;
				ctx.setPart('pinned', { once: true });
			};
			const assembler = buildSystemPromptAssembler([handler]);

			await assembler.assemble();
			await assembler.assemble();
			await assembler.assemble();

			expect(invocations).toBe(1);
		});

		it('does not pin when handler runs without calling setPart', async () => {
			let ran = 0;
			const handler: SystemPromptHandler = (ctx) => {
				ran += 1;
				if (ran > 1) ctx.setPart('late', { once: true });
			};
			const assembler = buildSystemPromptAssembler([handler]);

			expect(await assembler.assemble()).toBe('');
			expect(await assembler.assemble()).toBe('late');
			// Third call: already pinned, handler must not run again.
			expect(await assembler.assemble()).toBe('late');
			expect(ran).toBe(2);
		});
	});

	describe('factory form', () => {
		it('accepts a () => string factory and resolves it to the fragment', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart(() => 'from-factory'),
			]);
			expect(await assembler.assemble()).toBe('from-factory');
		});

		it('calls the factory on every assemble for non-pinned slots', async () => {
			let calls = 0;
			const handler: SystemPromptHandler = (ctx) => {
				ctx.setPart(() => {
					calls += 1;
					return `call-${calls}`;
				});
			};
			const assembler = buildSystemPromptAssembler([handler]);

			expect(await assembler.assemble()).toBe('call-1');
			expect(await assembler.assemble()).toBe('call-2');
			expect(calls).toBe(2);
		});

		it('calls the factory exactly once when paired with { once: true }', async () => {
			let calls = 0;
			const handler: SystemPromptHandler = (ctx) => {
				ctx.setPart(
					() => {
						calls += 1;
						return 'pinned-factory';
					},
					{ once: true },
				);
			};
			const assembler = buildSystemPromptAssembler([handler]);

			await assembler.assemble();
			await assembler.assemble();
			await assembler.assemble();

			expect(calls).toBe(1);
		});

		it('bucketing applies to factory-produced fragments the same as strings', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart(() => 'volatile'),
				(ctx) => ctx.setPart(() => 'stable', { cache: true }),
			]);
			expect(await assembler.assemble()).toBe('stable\n\nvolatile');
		});

		it('mixes string and factory fragments in the same assemble', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) => ctx.setPart('literal'),
				(ctx) => ctx.setPart(() => 'factory'),
			]);
			expect(await assembler.assemble()).toBe('literal\n\nfactory');
		});

		it('accepts an async () => Promise<string> factory', async () => {
			const assembler = buildSystemPromptAssembler([
				(ctx) =>
					ctx.setPart(async () => {
						await Promise.resolve();
						return 'async-result';
					}),
			]);
			expect(await assembler.assemble()).toBe('async-result');
		});

		it('async factory runs exactly once with { once: true }', async () => {
			let calls = 0;
			const handler: SystemPromptHandler = (ctx) => {
				ctx.setPart(
					async () => {
						calls += 1;
						await Promise.resolve();
						return `async-${calls}`;
					},
					{ once: true },
				);
			};
			const assembler = buildSystemPromptAssembler([handler]);

			expect(await assembler.assemble()).toBe('async-1');
			expect(await assembler.assemble()).toBe('async-1');
			expect(await assembler.assemble()).toBe('async-1');
			expect(calls).toBe(1);
		});

		it('async factory re-runs on each assemble when not pinned', async () => {
			let calls = 0;
			const handler: SystemPromptHandler = (ctx) => {
				ctx.setPart(async () => {
					calls += 1;
					await Promise.resolve();
					return `turn-${calls}`;
				});
			};
			const assembler = buildSystemPromptAssembler([handler]);

			expect(await assembler.assemble()).toBe('turn-1');
			expect(await assembler.assemble()).toBe('turn-2');
			expect(calls).toBe(2);
		});
	});
});
