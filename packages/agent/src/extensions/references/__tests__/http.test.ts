import { describe, expect, it, vi } from 'vitest';
import { createConfigurationModule } from '@franklin/extensibility/module';
import { documentDownloadPolicy } from '../download-policy/configuration.js';
import type { DocumentDownloadPolicy } from '../download-policy/types.js';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	withPolicy,
	type Fetch,
} from '@franklin/lib';
import {
	createMockMiniACP,
	toolCalls,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import {
	buildStateExtensionModule,
	createCoreStateModule,
	createEnvironmentModule,
	createReferencesModule,
	createStoreStateModule,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '../../../modules/index.js';
import { createRuntime } from '../../../testing/index.js';
import { StoreRegistry } from '../../../modules/store/api/registry/index.js';
import { editExtension } from '../../filesystem/edit/extension.js';
import { fileKey } from '../../filesystem/common/key.js';
import type { HTTPReferenceCache } from '../cache.js';
import {
	createHTTPReferenceExtension,
	referenceHandlerExtension,
	referenceReadExtension,
	textDocumentReferenceExtension,
} from '../index.js';

const url = 'https://example.com/book.pdf';
const bytes = new TextEncoder().encode('%PDF-1.7\n');
const config: EnvironmentConfig = {
	fsConfig: {
		cwd: '/project' as EnvironmentConfig['fsConfig']['cwd'],
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: ['blocked.example'] },
};

function response(body = bytes, mime = 'application/pdf') {
	return {
		url,
		status: 200,
		statusText: 'OK',
		headers: { 'content-type': mime },
		body,
	};
}

function createCacheMock() {
	return {
		getOrLoad: vi.fn<HTTPReferenceCache['getOrLoad']>(async () => response()),
		clear: vi.fn(),
	};
}

async function setup(
	fetch: Fetch,
	options = {},
	readPolicy?: () => DocumentDownloadPolicy,
) {
	const activeConfig = structuredClone(config);
	const filesystem = new MemoryFilesystem();
	const environment: ReconfigurableEnvironment = {
		filesystem,
		process: { exec: vi.fn() },
		web: { fetch: withPolicy(activeConfig.netConfig)(fetch) },
		osInfo: new MemoryOsInfo(),
		config: async () => activeConfig,
		reconfigure: async () => {},
		dispose: async () => {},
	};
	const mock = createMockMiniACP({
		defaultTurn: turn([
			toolCalls([
				{ name: 'read_file', arguments: { path: url, selector: 'pages=2-4' } },
			]),
			turnEnd(),
		]),
	});
	const module = buildStateExtensionModule([
		createCoreStateModule(mock.connector),
		createStoreStateModule(new StoreRegistry()),
		createEnvironmentModule(async () => environment),
		createReferencesModule(),
		createConfigurationModule(),
	]);
	const runtime = await createRuntime(module, module.emptyState(), [
		editExtension(),
		createHTTPReferenceExtension(options),
		...(readPolicy ? [documentDownloadPolicy.compute([], readPolicy)] : []),
		referenceHandlerExtension({
			test: (ref) => ref.data?.mime === 'application/pdf',
			toContext: (ref) => ({
				content: {
					type: 'text',
					text: `Reference: ${ref.locator}\n${ref.selector}\nPDF bytes: ${ref.data?.bytes.length}`,
				},
			}),
		}),
		textDocumentReferenceExtension,
		referenceReadExtension,
	]);
	return { runtime, mock, config: activeConfig };
}

describe('HTTP references', () => {
	it('reads live configuration per download and retains the snapshot for a running request', async () => {
		let policy = { idleTimeoutMs: 60_000, totalTimeoutMs: 900_000 };
		let complete!: () => void;
		let signalStarted!: () => void;
		const started = new Promise<void>((resolve) => {
			signalStarted = resolve;
		});
		const pending = new Promise<void>((resolve) => {
			complete = resolve;
		});
		const fetch = vi
			.fn<Fetch>()
			.mockImplementationOnce(async () => {
				signalStarted();
				await pending;
				return response();
			})
			.mockResolvedValue(response());
		const { runtime } = await setup(fetch, {}, () => policy);
		try {
			const first = runtime.references.toContext({ locator: url });
			await started;
			policy = { idleTimeoutMs: 120_000, totalTimeoutMs: 1_200_000 };
			complete();
			expect((await first).isError).not.toBe(true);
			expect(
				(await runtime.references.toContext({ locator: url })).isError,
			).not.toBe(true);
			expect(fetch.mock.calls[0]?.[0].idleTimeoutMs).toBe(60_000);
			expect(fetch.mock.calls[1]?.[0].idleTimeoutMs).toBe(120_000);
			expect(
				fetch.mock.calls[1]![0].deadline! - fetch.mock.calls[0]![0].deadline!,
			).toBeGreaterThanOrEqual(300_000);
		} finally {
			await runtime.dispose();
		}
	});

	it('uses cached source bytes for different selectors while preserving each requested view', async () => {
		const fetch = vi.fn<Fetch>();
		const cache = createCacheMock();
		const { runtime } = await setup(fetch, { cache });
		try {
			const first = await runtime.references.toContext({
				locator: url,
				selector: 'pages=1-2',
			});
			const second = await runtime.references.toContext({
				locator: `${url}#page=3`,
				selector: 'pages=3-4',
			});
			expect(first.isError).not.toBe(true);
			expect(second.isError).not.toBe(true);
			expect(first.content).toMatchObject({
				text: expect.stringContaining('pages=1-2'),
			});
			expect(second.content).toMatchObject({
				text: expect.stringContaining('pages=3-4'),
			});
			expect(fetch).not.toHaveBeenCalled();
			expect(cache.getOrLoad.mock.calls[0]?.[0]).toBe(
				cache.getOrLoad.mock.calls[1]?.[0],
			);
			await runtime.references.toContext({ locator: `${url}?edition=2` });
			expect(cache.getOrLoad.mock.calls[2]?.[0]).not.toBe(
				cache.getOrLoad.mock.calls[0]?.[0],
			);
		} finally {
			await runtime.dispose();
		}
	});

	it('checks current permissions before consulting a cache and partitions changed policies', async () => {
		const cache = createCacheMock();
		const { runtime, config } = await setup(vi.fn<Fetch>(), { cache });
		try {
			await runtime.references.toContext({ locator: url });
			config.netConfig.deniedDomains.push('redirect.example');
			await runtime.references.toContext({ locator: url });
			expect(cache.getOrLoad.mock.calls[0]?.[0]).not.toBe(
				cache.getOrLoad.mock.calls[1]?.[0],
			);
			config.netConfig.deniedDomains.push('example.com');
			const denied = await runtime.references.toContext({ locator: url });
			expect(denied.isError).toBe(true);
			expect(denied.content).toMatchObject({
				text: expect.stringContaining('Network access denied'),
			});
			expect(cache.getOrLoad).toHaveBeenCalledTimes(2);
		} finally {
			await runtime.dispose();
		}
	});

	it('delegates remote PDF bytes and page selection without recording a filesystem read', async () => {
		const fetch = vi.fn<Fetch>().mockResolvedValue(response());
		const { runtime, mock } = await setup(fetch);
		try {
			for await (const _event of runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'read PDF' }],
			})) {
				/* Drain the tool turn. */
			}
			expect(mock.calls().toolResults[0]).toMatchObject({
				content: [
					{ type: 'text', text: expect.stringContaining(`${url}\npages=2-4`) },
				],
			});
			expect(mock.calls().toolResults[0]?.isError).not.toBe(true);
			expect(runtime.getStore(fileKey).get()).toEqual({});
			expect(fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					deadline: expect.any(Number),
					maxResponseBytes: 64 * 1024 * 1024,
				}),
			);
		} finally {
			await runtime.dispose();
		}
	});

	it('preserves source identity across a redirect and detects a PDF with generic MIME', async () => {
		const fetch = vi
			.fn<Fetch>()
			.mockResolvedValueOnce({
				...response(),
				status: 302,
				headers: { location: '/download' },
			})
			.mockResolvedValueOnce(response(bytes, 'application/octet-stream'));
		const { runtime } = await setup(fetch);
		try {
			const context = await runtime.references.toContext({
				locator: url,
				selector: 'pages=5-6',
			});
			expect(context.isError).not.toBe(true);
			expect(context.content).toMatchObject({
				text: expect.stringContaining(`${url}\npages=5-6`),
			});
			expect(fetch).toHaveBeenLastCalledWith(
				expect.objectContaining({ url: 'https://example.com/download' }),
			);
		} finally {
			await runtime.dispose();
		}
	});

	it('checks permissions again on redirects', async () => {
		const fetch = vi.fn<Fetch>().mockResolvedValue({
			...response(),
			status: 302,
			headers: { location: 'https://blocked.example/book.pdf' },
		});
		const { runtime } = await setup(fetch);
		try {
			const context = await runtime.references.toContext({ locator: url });
			expect(context.isError).toBe(true);
			expect(context.content).toMatchObject({
				text: expect.stringContaining('Network access denied'),
			});
			expect(fetch).toHaveBeenCalledTimes(1);
		} finally {
			await runtime.dispose();
		}
	});

	it('rejects oversized downloads even when a custom transport ignores byte limits', async () => {
		const { runtime } = await setup(async () => response(), { maxBytes: 3 });
		try {
			const context = await runtime.references.toContext({ locator: url });
			expect(context.isError).toBe(true);
			expect(context.content).toMatchObject({
				text: expect.stringContaining('exceeds 3 bytes'),
			});
		} finally {
			await runtime.dispose();
		}
	});

	it('returns actionable guidance when a PDF link serves an HTML page', async () => {
		const { runtime } = await setup(async () =>
			response(new TextEncoder().encode('<html>login</html>'), 'text/html'),
		);
		try {
			const context = await runtime.references.toContext({ locator: url });
			expect(context.isError).toBe(true);
			expect(context.content).toMatchObject({
				text: expect.stringContaining('fetch_url'),
			});
		} finally {
			await runtime.dispose();
		}
	});
});
