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
					test(reference) {
						return reference.locator === 'hello';
					},
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
				locator: 'hello',
			}),
		).resolves.toEqual({
			content: [{ type: 'text', text: 'hello' }],
		});
	});

	it('returns unavailable content for unknown references', async () => {
		const system = createReferencesModule();
		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			() => {},
		);

		await expect(
			runtime.references.toContext({
				locator: 'missing.reference',
			}),
		).resolves.toEqual({
			content: [
				{
					type: 'text',
					text: 'Reference unavailable: No reference handler matched "missing.reference"',
				},
			],
			isError: true,
		});
	});

	it('binds handlers to the composed runtime', async () => {
		const system = createReferencesModule();

		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			(api) => {
				api.registerReferenceHandler({
					test(reference) {
						return reference.locator === 'alias';
					},
					toContext(reference, delegate) {
						return delegate({
							locator: 'expanded',
							...(reference.label ? { label: reference.label } : {}),
						});
					},
				});
				api.registerReferenceHandler({
					test(reference) {
						return reference.locator === 'expanded';
					},
					toContext() {
						return {
							content: [{ type: 'text', text: 'expanded' }],
						};
					},
				});
			},
		);

		const context = await runtime.references.toContext({
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
					test(reference) {
						return reference.locator === 'failing.document';
					},
					toContext() {
						throw new Error('boom');
					},
				});
			},
		);

		await expect(
			runtime.references.toContext({
				locator: 'failing.document',
			}),
		).resolves.toEqual({
			content: [
				{
					type: 'text',
					text: 'Reference unavailable: Reference handler for "failing.document" failed: boom',
				},
			],
			isError: true,
		});
	});

	it('continues delegation after the current handler', async () => {
		const system = createReferencesModule();

		const runtime = await compile(
			system.extensionPoint,
			system.compiler,
			(api) => {
				api.registerReferenceHandler({
					test(reference) {
						return reference.locator === 'start';
					},
					toContext(_reference, delegate) {
						return delegate({
							locator: 'delegated',
						});
					},
				});
				api.registerReferenceHandler({
					test(reference) {
						return reference.locator === 'delegated';
					},
					toContext(reference) {
						return {
							content: [{ type: 'text', text: reference.locator }],
						};
					},
				});
			},
		);

		await expect(
			runtime.references.toContext({
				locator: 'start',
			}),
		).resolves.toEqual({
			content: [{ type: 'text', text: 'delegated' }],
		});
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
