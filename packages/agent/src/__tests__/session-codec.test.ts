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
			messages: [
				{
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				},
			],
			llmConfig: {
				provider: 'openai-codex',
				model: 'gpt-5.4',
				reasoning: 'medium',
			},
			usage: ZERO_USAGE,
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

		expect(franklinSessionCodec.decode({ version: 1, data: v1 })).toEqual({
			ok: true,
			value: {
				...v1,
				details: { visibility: 'visible' },
			},
		});
	});

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
