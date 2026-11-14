import { createMessageEntries } from '../modules/core/history/create.js';
import { describe, expect, it } from 'vitest';
import type { AbsolutePath } from '@franklin/lib';
import { ZERO_USAGE } from '@franklin/mini-acp';
import type { FranklinSession } from '../types.js';
import {
	franklinSessionCodec,
	SESSION_FILE_VERSION,
} from '../app/session/codecs/index.js';

function session(): FranklinSession {
	return {
		details: {
			visibility: 'hidden',
		},
		core: {
			entries: createMessageEntries(
				[
					{
						role: 'user',
						content: [{ type: 'text', text: 'hello' }],
					},
				],
				'test',
			),
			llmConfig: {
				provider: 'openai-codex',
				model: 'gpt-5.4',
				reasoning: 'medium',
			},
			usage: ZERO_USAGE,
			toolFilter: { disabled: ['set_chat_title'] },
		},
		store: {
			todos: 'store-1',
		},
		env: {
			fsConfig: {
				cwd: '/workspace' as AbsolutePath,
				permissions: {
					allowRead: ['**'],
					denyRead: [],
					allowWrite: ['src/**'],
					denyWrite: ['node_modules/**'],
				},
			},
			netConfig: {
				allowedDomains: ['example.com'],
				deniedDomains: ['localhost:9222'],
			},
		},
	};
}

describe('session codec', () => {
	it('encodes sessions as a versioned envelope', () => {
		const value = session();

		expect(franklinSessionCodec.encode(value)).toEqual({
			version: SESSION_FILE_VERSION,
			data: value,
		});
	});

	it('decodes a versioned envelope', () => {
		const value = session();

		expect(
			franklinSessionCodec.decode({
				version: SESSION_FILE_VERSION,
				data: value,
			}),
		).toEqual({
			ok: true,
			value,
		});
	});

	it('migrates v1 sessions with default visible details', () => {
		const { details: _details, ...v1 } = session();
		const { entries, ...core } = v1.core;
		const messages = entries.flatMap((entry) =>
			entry.type === 'message' ? [entry.message] : [],
		);

		expect(
			franklinSessionCodec.decode({
				version: 1,
				data: { ...v1, core: { ...core, messages } },
			}),
		).toEqual({
			ok: true,
			value: {
				...v1,
				core: { ...core, entries: createMessageEntries(messages, 'legacy') },
				details: { visibility: 'visible' },
			},
		});
	});

	it('hydrates older core sessions with all tools enabled', () => {
		const value = session();
		const { toolFilter: _toolFilter, ...core } = value.core;

		expect(
			franklinSessionCodec.decode({
				version: SESSION_FILE_VERSION,
				data: {
					...value,
					core,
				},
			}),
		).toEqual({
			ok: true,
			value: {
				...value,
				core: {
					...core,
					toolFilter: { disabled: [] },
				},
			},
		});
	});

	it('migrates v2 message history while preserving visibility, config and usage', () => {
		const value = session();
		const { entries, ...core } = value.core;
		const messages = entries.flatMap((entry) =>
			entry.type === 'message' ? [entry.message] : [],
		);
		expect(
			franklinSessionCodec.decode({
				version: 2,
				data: { ...value, core: { ...core, messages } },
			}),
		).toEqual({
			ok: true,
			value: {
				...value,
				core: { ...core, entries: createMessageEntries(messages, 'legacy') },
			},
		});
	});

	it('rejects a persisted checkpoint reusing a message ID', () => {
		const value = session();
		value.core.entries.push({
			type: 'compaction',
			id: 'test-0',
			summary: 'summary',
		});
		expect(
			franklinSessionCodec.decode({
				version: SESSION_FILE_VERSION,
				data: value,
			}),
		).toMatchObject({ ok: false, issue: { kind: 'schema-mismatch' } });
	});

	it('roundtrips repeated checkpoints and every raw message with stable IDs', () => {
		const value = session();
		value.core.entries.push(
			{
				type: 'compaction',
				id: 'first',
				summary: '  original summary\n',
			},
			...createMessageEntries(
				[{ role: 'assistant', content: [{ type: 'text', text: 'after' }] }],
				'after',
			),
			{
				type: 'compaction',
				id: 'second',
				summary: 'replacement summary',
			},
		);
		const encoded: unknown = JSON.parse(
			JSON.stringify(franklinSessionCodec.encode(value)),
		);
		expect(franklinSessionCodec.decode(encoded)).toEqual({ ok: true, value });
	});

	it.each(['duplicate', 'empty-id', 'empty-summary'])(
		'rejects invalid v3 history: %s',
		(kind) => {
			const value = session();
			const first = value.core.entries[0]!;
			switch (kind) {
				case 'duplicate':
					value.core.entries.push(first);
					break;
				case 'empty-id':
					value.core.entries.push({ ...first, id: '' });
					break;
				case 'empty-summary':
					value.core.entries.push({
						type: 'compaction',
						id: 'fence',
						summary: '  ',
					});
					break;
			}
			expect(
				franklinSessionCodec.decode({ version: 3, data: value }),
			).toMatchObject({ ok: false, issue: { kind: 'schema-mismatch' } });
		},
	);

	it.each([1, 2])(
		'migrates all v%i message roles deterministically and roundtrips v3',
		(version) => {
			const value = session();
			const messages = [
				{
					role: 'user' as const,
					content: [{ type: 'text' as const, text: 'question' }],
				},
				{
					role: 'assistant' as const,
					content: [
						{
							type: 'toolCall' as const,
							id: 'call',
							name: 'lookup',
							arguments: {},
						},
					],
				},
				{
					role: 'toolResult' as const,
					toolCallId: 'call',
					content: [{ type: 'text' as const, text: 'result' }],
				},
			];
			const { entries: _entries, toolFilter: _filter, ...core } = value.core;
			const { details: _details, ...legacy } = value;
			const raw = {
				version,
				data: {
					...(version === 1 ? legacy : value),
					core: { ...core, messages },
				},
			};
			const expected = {
				...value,
				details: version === 1 ? { visibility: 'visible' } : value.details,
				core: {
					...core,
					toolFilter: { disabled: [] },
					entries: createMessageEntries(messages, 'legacy'),
				},
			};
			const migrated = franklinSessionCodec.decode(raw);
			expect(migrated).toEqual({ ok: true, value: expected });
			expect(franklinSessionCodec.decode(raw)).toEqual(migrated);
			if (!migrated.ok) throw new Error('Migration failed');
			expect(
				franklinSessionCodec.decode(
					franklinSessionCodec.encode(migrated.value),
				),
			).toEqual(migrated);
		},
	);

	it('rejects missing session roots', () => {
		expect(
			franklinSessionCodec.decode({
				version: SESSION_FILE_VERSION,
				data: { core: session().core, env: session().env },
			}),
		).toMatchObject({
			ok: false,
			issue: { kind: 'schema-mismatch', version: SESSION_FILE_VERSION },
		});
	});

	it('rejects future versions', () => {
		expect(
			franklinSessionCodec.decode({ version: 999, data: session() }),
		).toEqual({
			ok: false,
			issue: {
				kind: 'version-ahead',
				version: 999,
				currentVersion: SESSION_FILE_VERSION,
			},
		});
	});

	it('drops accidentally persisted api keys from llm config', () => {
		const value = session();
		const raw = {
			version: SESSION_FILE_VERSION,
			data: {
				...value,
				core: {
					...value.core,
					llmConfig: {
						...value.core.llmConfig,
						apiKey: 'secret',
					},
				},
			},
		};

		expect(franklinSessionCodec.decode(raw)).toEqual({
			ok: true,
			value,
		});
	});
});
