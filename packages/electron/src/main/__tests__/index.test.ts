import type { WebContents } from 'electron';
import type { Filesystem } from '@franklin/lib';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const handleMap = new Map<string, (...args: any[]) => any>();

vi.mock('electron', () => ({
	ipcMain: {
		handle: (channel: string, handler: (...args: any[]) => any) => {
			handleMap.set(channel, handler);
		},
		removeHandler: (channel: string) => {
			handleMap.delete(channel);
		},
		on: vi.fn(),
		removeListener: vi.fn(),
	},
}));

const noop = async () => {};

async function createFlow() {
	return {
		onAuth: () => () => {},
		onProgress: () => () => {},
		login: async () => ({}),
		dispose: async () => {},
	};
}

function createFilesystem(): Filesystem {
	return {
		readFile: async () => new Uint8Array(),
		writeFile: noop,
		mkdir: noop,
		access: noop,
		stat: async () => ({ isFile: true, isDirectory: false }),
		readdir: async () => [],
		exists: async () => true,
		glob: async () => [],
		deleteFile: noop,
		resolve: async (...paths: string[]) => paths[paths.length - 1]!,
	};
}

describe('initializeMain', () => {
	beforeEach(() => {
		handleMap.clear();
		vi.resetModules();
	});

	it('registers platform proxy handlers under the shared proxy namespace', async () => {
		const { initializeMain } = await import('../index.js');
		const { FRANKLIN_PROXY_CHANNEL_NAMESPACE } =
			await import('../../shared/channels.js');

		const platform = {
			spawn: async () => ({
				readable: new ReadableStream(),
				writable: new WritableStream(),
				close: noop,
				dispose: noop,
			}),
			environment: async () =>
				Object.assign(
					{
						filesystem: createFilesystem(),
						terminal: {
							exec: async () => ({ exit_code: 0, stdout: '', stderr: '' }),
						},
						web: {
							fetch: async () => ({
								requestedUrl: 'https://example.com',
								finalUrl: 'https://example.com',
								status: 200,
								statusText: 'OK',
								contentType: 'text/plain',
								kind: 'text',
								text: '',
								truncated: false,
								isError: false,
								cacheable: true,
							}),
						},
						config: async () => ({
							fsConfig: {
								cwd: '/tmp',
								permissions: { allowRead: ['**'], allowWrite: ['**'] },
							},
							netConfig: { allowedDomains: [], deniedDomains: [] },
						}),
						reconfigure: noop,
					},
					{ dispose: noop },
				),
			filesystem: createFilesystem(),
			ai: {
				getOAuthProviders: async () => [],
				getApiKeyProviders: async () => [],
			},
			createFlow,
			openExternal: async () => {},
		};

		const handle = initializeMain(
			{ id: 1, send: vi.fn() } as unknown as WebContents,
			platform as never,
		);

		expect(
			handleMap.has(`${FRANKLIN_PROXY_CHANNEL_NAMESPACE}:filesystem:readFile`),
		).toBe(true);
		expect(
			handleMap.has(`${FRANKLIN_PROXY_CHANNEL_NAMESPACE}:spawn:connect`),
		).toBe(true);
		expect(
			handleMap.has(`${FRANKLIN_PROXY_CHANNEL_NAMESPACE}:ai:getOAuthProviders`),
		).toBe(true);
		expect(
			handleMap.has(`${FRANKLIN_PROXY_CHANNEL_NAMESPACE}:createFlow:connect`),
		).toBe(true);
		expect(
			handleMap.has(`${FRANKLIN_PROXY_CHANNEL_NAMESPACE}:openExternal`),
		).toBe(true);
		expect(handleMap.has('franklin:filesystem:readFile')).toBe(false);

		await handle.dispose();
	}, 15_000);
});
