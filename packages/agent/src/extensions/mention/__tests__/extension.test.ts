import { describe, expect, it, vi } from 'vitest';
import { createMockMiniACP, finishedTurn } from '@franklin/mini-acp/mock';
import {
	buildStateExtensionModule,
	createCoreStateModule,
	createReferencesModule,
} from '../../../modules/index.js';
import { createRuntime, collectEvents } from '../../../testing/index.js';
import type { Reference } from '../../../modules/references/index.js';
import { referenceHandlerExtension } from '../../references/index.js';
import { formatReferenceMention } from '../embedding.js';
import { mentionExtension } from '../extension.js';

function userPrompt(text: string) {
	return {
		role: 'user' as const,
		content: [{ type: 'text' as const, text }],
	};
}

async function createMentionRuntime() {
	const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
	const module = buildStateExtensionModule([
		createCoreStateModule(mock.connector),
		createReferencesModule(),
	]);
	const materialize = vi.fn((reference: Reference) => ({
		content: [
			{
				type: 'text' as const,
				text: `Materialized: ${reference.locator}`,
			},
		],
	}));
	const runtime = await createRuntime(module, module.emptyState(), [
		referenceHandlerExtension({
			test: () => true,
			toContext: (reference) => materialize(reference),
		}),
		mentionExtension,
	]);

	return { mock, runtime, materialize };
}

describe('mentionExtension', () => {
	it('appends materialized reference content to prompts with embedded references', async () => {
		const reference = {
			type: 'file',
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		};
		const { mock, runtime, materialize } = await createMentionRuntime();

		try {
			await collectEvents(
				runtime.prompt(userPrompt(`Read ${formatReferenceMention(reference)}`)),
			);
		} finally {
			await runtime.dispose();
		}

		expect(materialize).toHaveBeenCalledWith(reference);
		expect(mock.calls().prompts[0]?.content).toEqual([
			{ type: 'text', text: `Read ${formatReferenceMention(reference)}` },
			{ type: 'text', text: 'Materialized: notes/deep work.md' },
		]);
	});

	it('deduplicates repeated references within a prompt', async () => {
		const reference = {
			type: 'file',
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		};
		const mention = formatReferenceMention(reference);
		const { runtime, materialize } = await createMentionRuntime();

		try {
			await collectEvents(runtime.prompt(userPrompt(`${mention}\n${mention}`)));
		} finally {
			await runtime.dispose();
		}

		expect(materialize).toHaveBeenCalledTimes(1);
	});

	it('deduplicates references by identity instead of label', async () => {
		const first = {
			type: 'file',
			locator: 'notes/deep work.md',
			selector: 'lines=1-5',
			label: 'Deep Work',
		};
		const second = {
			type: 'file',
			locator: 'notes/deep work.md',
			selector: 'lines=1-5',
			label: 'Deep Work Copy',
		};
		const { runtime, materialize } = await createMentionRuntime();

		try {
			await collectEvents(
				runtime.prompt(
					userPrompt(
						`${formatReferenceMention(first)}\n${formatReferenceMention(second)}`,
					),
				),
			);
		} finally {
			await runtime.dispose();
		}

		expect(materialize).toHaveBeenCalledTimes(1);
		expect(materialize).toHaveBeenCalledWith(first);
	});

	it('leaves prompts without embedded references unchanged', async () => {
		const { mock, runtime, materialize } = await createMentionRuntime();

		try {
			await collectEvents(runtime.prompt(userPrompt('No references here')));
		} finally {
			await runtime.dispose();
		}

		expect(materialize).not.toHaveBeenCalled();
		expect(mock.calls().prompts[0]?.content).toEqual([
			{ type: 'text', text: 'No references here' },
		]);
	});
});
