import { describe, expect, it } from 'vitest';
import { compile } from '@franklin/extensibility';
import { createReferencesModule } from '../module.js';
import { referenceContextsToContent } from '../index.js';
import { ReferencesEngine } from '../engine.js';

describe('createReferencesModule', () => {
	it('resolves one reference through a registered handler', async () => {
		const system = createReferencesModule();

		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			(api) => {
				api.registerReferenceHandler({
					type: 'text.document',
					toContext(reference) {
						return {
							content: [{ type: 'text', text: reference.locator }],
						};
					},
				});
			},
		);

		expect(runtime.references).toBeInstanceOf(ReferencesEngine);
		await expect(
			runtime.references.toContext({
				type: 'text.document',
				locator: 'hello',
			}),
		).resolves.toEqual({
			content: [{ type: 'text', text: 'hello' }],
		});
	});

	it('returns unavailable content for unknown reference types', async () => {
		const system = createReferencesModule();
		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			() => {},
		);

		await expect(
			runtime.references.toContext({
				type: 'missing.reference',
				locator: 'x',
			}),
		).resolves.toEqual({
			content: [
				{
					type: 'text',
					text: 'Reference unavailable: No reference handler registered for "missing.reference"',
				},
			],
		});
	});

	it('binds handlers to the composed runtime', async () => {
		const system = createReferencesModule();

		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			(api) => {
				api.registerReferenceHandler({
					type: 'alias.document',
					toContext(reference, ctx) {
						void reference;
						return ctx.references.toContext({
							type: 'text.document',
							locator: 'expanded',
						});
					},
				});
				api.registerReferenceHandler({
					type: 'text.document',
					toContext() {
						return {
							content: [{ type: 'text', text: 'expanded' }],
						};
					},
				});
			},
		);

		const context = await runtime.references.toContext({
			type: 'alias.document',
			locator: 'alias',
		});

		expect(context).toEqual({
			content: [{ type: 'text', text: 'expanded' }],
		});
	});

	it('returns unavailable content when a handler throws', async () => {
		const system = createReferencesModule();

		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			(api) => {
				api.registerReferenceHandler({
					type: 'failing.document',
					toContext() {
						throw new Error('boom');
					},
				});
			},
		);

		await expect(
			runtime.references.toContext({
				type: 'failing.document',
				locator: 'x',
			}),
		).resolves.toEqual({
			content: [
				{
					type: 'text',
					text: 'Reference unavailable: Handler for "failing.document" failed: boom',
				},
			],
		});
	});

	it('rejects duplicate handlers for one reference type', async () => {
		const system = createReferencesModule();

		await expect(
			compile(system.extensionPoint, system.compiler, (api) => {
				api.registerReferenceHandler({
					type: 'text.document',
					toContext: () => ({ content: [] }),
				});
				api.registerReferenceHandler({
					type: 'text.document',
					toContext: () => ({ content: [] }),
				});
			}),
		).rejects.toThrow(
			'Reference handler "text.document" registered more than once',
		);
	});

	it('projects reference contexts into prompt content', () => {
		expect(
			referenceContextsToContent([
				{ content: [{ type: 'text', text: 'first' }] },
				{ content: [{ type: 'text', text: 'second' }] },
			]),
		).toEqual([
			{ type: 'text', text: 'first' },
			{ type: 'text', text: 'second' },
		]);
	});
});
