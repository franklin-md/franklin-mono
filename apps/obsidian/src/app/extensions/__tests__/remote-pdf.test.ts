import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHTTPReferenceCache } from '@franklin/node';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import {
	createFranklinAgents,
	filesystemBundle,
	referenceReadExtension,
	type AuthManager,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '@franklin/agent';
import {
	createMockMiniACP,
	toolCalls,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { createObsidianReferenceExtensions } from '../references.js';
import { createInboxResearchExtensions } from '../../../inbox/agent/research.js';

vi.mock('unpdf', () => ({
	extractText: vi.fn(async () => ({
		text: ['Contents', 'Selected chapter', 'Following chapter'],
	})),
	extractLinks: vi.fn(async () => ({ links: [] })),
}));
vi.mock('../pdf/screenshots.js', () => ({
	renderObsidianPDFScreenshots: vi.fn(async () => []),
}));

describe('Obsidian remote PDFs', () => {
	it('shares downloaded PDFs between chat and inbox while reading each requested page range', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'franklin-obsidian-cache-'));
		const referenceCache = createHTTPReferenceCache(directory);
		const config: EnvironmentConfig = {
			fsConfig: {
				cwd: '/vault' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		};
		const environment: ReconfigurableEnvironment = {
			filesystem: new MemoryFilesystem(),
			process: { exec: vi.fn() },
			web: {
				fetch: vi.fn(async () => ({
					url: 'https://example.com/book.pdf',
					status: 200,
					statusText: 'OK',
					headers: { 'content-type': 'application/pdf' },
					body: new TextEncoder().encode('%PDF-1.7\n'),
				})),
			},
			osInfo: new MemoryOsInfo(),
			config: async () => config,
			reconfigure: async () => {},
			dispose: async () => {},
		};
		const mock = createMockMiniACP({
			defaultTurn: turn([
				toolCalls([
					{
						name: 'read_file',
						arguments: {
							path: 'https://example.com/book.pdf',
							selector: 'pages=2-2',
						},
					},
				]),
				turnEnd(),
			]),
		});
		const auth = {
			getApiKey: async () => undefined,
			entries: () => ({}),
			onAuthChange: () => () => {},
		} as unknown as AuthManager;
		const agents = createFranklinAgents({
			connect: mock.connector,
			environment: async () => environment,
			auth,
			extensions: [
				...createObsidianReferenceExtensions(referenceCache),
				filesystemBundle.extensions.editFile,
				referenceReadExtension,
			],
		});
		const { runtime } = await agents.create({ state: { env: config } });
		const inboxAgents = createFranklinAgents({
			connect: mock.connector,
			environment: async () => environment,
			auth,
			extensions: createInboxResearchExtensions({
				vaultName: 'Study',
				referenceCache,
			}),
		});
		const { runtime: inboxRuntime } = await inboxAgents.create({
			state: { env: config },
		});
		try {
			for await (const _event of runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'Read selected chapter' }],
			})) {
				/* Drain the tool turn. */
			}
			const result = mock.calls().toolResults[0];
			expect(result?.isError).not.toBe(true);
			const text = result?.content[0];
			expect(text).toMatchObject({
				type: 'text',
				text: expect.stringContaining('Selected chapter'),
			});
			expect(text).toMatchObject({
				text: expect.stringContaining(
					'Reference: https://example.com/book.pdf',
				),
			});
			expect(text).not.toMatchObject({
				text: expect.stringContaining('Following chapter'),
			});
			expect(runtime.getStore(filesystemBundle.keys.file).get()).toEqual({});
			const nextPage = await inboxRuntime.references.toContext({
				locator: 'https://example.com/book.pdf',
				selector: 'pages=3-3',
			});
			expect(nextPage.isError).not.toBe(true);
			expect(nextPage.content).toMatchObject({
				text: expect.stringContaining('Following chapter'),
			});
			expect(nextPage.content).not.toMatchObject({
				text: expect.stringContaining('Selected chapter'),
			});
			expect(environment.web.fetch).toHaveBeenCalledTimes(1);
		} finally {
			await runtime.dispose();
			await inboxRuntime.dispose();
			await rm(directory, { recursive: true, force: true });
		}
	});
});
