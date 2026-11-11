// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { ApplicationProvider } from '@franklin/ui';
import {
	createPersistedStore,
	createStore,
	AuthManager,
	type AppSettings,
	type FranklinApp,
} from '@franklin/agent';
import type { AbsolutePath } from '@franklin/lib';
import { createNodePlatform } from '@franklin/node';
import { MCPConnections } from '@franklin/extension-mcp';
import { MemorySecretStorage } from '../../../app/auth/memory-secret-storage.js';
import { createObsidianAuthStore } from '../../../app/auth/store.js';
import { ConnectionSettings } from '../settings.js';
import { saveConnection } from '../save.js';

const hosts: MCPConnections[] = [];
afterEach(async () => {
	cleanup();
	await Promise.all(hosts.splice(0).map((host) => host.dispose()));
});
function setup() {
	const initial: AppSettings = {
		mcpServers: [],
		documentDownloads: { idleTimeoutMs: 60000, totalTimeoutMs: 900000 },
		shareViewedReferencesByDefault: true,
		defaultLLMConfig: { provider: 'test', model: 'test', reasoning: 'medium' },
	};
	const persist = vi.fn(async () => {});
	const settings = createPersistedStore(createStore(initial), {
		persist,
		restore: async () => ({ value: initial, issues: [] }),
	});
	const storage = new MemorySecretStorage();
	const auth = new AuthManager(
		createNodePlatform({ appDir: '/test/franklin' as AbsolutePath }),
		createObsidianAuthStore(storage),
	);
	const setKey = vi.spyOn(auth, 'setApiKeyEntry');
	const removeKey = vi.spyOn(auth, 'removeApiKeyEntry');
	const connections = new MCPConnections({
		getServers: () => settings.get().mcpServers,
		getCredential: (id) => auth.getApiKey(id),
		subscribeConfiguration: (notify) => settings.subscribe(notify),
		subscribeCredentials: (notify) => auth.onAuthChange(notify),
		createFetch: () =>
			vi.fn(async () => {
				throw new Error('no network in UI test');
			}),
	});
	hosts.push(connections);
	const app = { settings, auth } as unknown as FranklinApp;
	render(
		<ApplicationProvider harness={app} hostActionBindings={[]}>
			<ConnectionSettings connections={connections} />
		</ApplicationProvider>,
	);
	return { settings, auth, storage, connections, persist, setKey, removeKey };
}

describe('Connections settings', () => {
	it('stages an Exa key until save and stores only credential references in settings', async () => {
		const { settings, storage, connections, setKey } = setup();
		fireEvent.click(screen.getByRole('button', { name: 'Add Exa' }));
		const key = screen.getByLabelText<HTMLInputElement>('Exa API key');
		expect(key.type).toBe('password');
		fireEvent.change(key, { target: { value: 'private-exa-key' } });
		expect(setKey).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Save connection' }));
		await waitFor(() => expect(settings.get().mcpServers).toHaveLength(1));
		expect(JSON.stringify(settings.get())).not.toContain('private-exa-key');
		expect(setKey).toHaveBeenCalledWith(expect.stringMatching(/^mcp-/), {
			type: 'apiKey',
			key: 'private-exa-key',
		});
		const restored = createObsidianAuthStore(storage);
		await restored.restore();
		const header = settings.get().mcpServers[0]?.authentication;
		if (header?.kind !== 'headers') throw new Error('Missing saved header');
		const credentialId = header.headers[0]?.credentialId;
		if (!credentialId) throw new Error('Missing credential reference');
		expect(restored.get()[credentialId]?.apiKey?.key).toBe('private-exa-key');
		expect(
			screen.getByRole<HTMLInputElement>('checkbox', { name: /Research agent/ })
				.checked,
		).toBe(false);
		const test = vi.spyOn(connections, 'testConnection').mockResolvedValue({
			state: 'connected',
			message: 'Connected · key configured',
		});
		fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
		await waitFor(() => expect(test).toHaveBeenCalledOnce());
	});
	it('rejects malformed endpoints before saving credentials', async () => {
		const { settings, setKey } = setup();
		fireEvent.click(screen.getByRole('button', { name: 'Add Exa' }));
		fireEvent.change(screen.getByLabelText('HTTPS MCP endpoint'), {
			target: { value: 'http://unsafe.test/mcp' },
		});
		fireEvent.change(screen.getByLabelText('Exa API key'), {
			target: { value: 'private-exa-key' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Save connection' }));
		expect(await screen.findByRole('alert')).toBeTruthy();
		expect(settings.get().mcpServers).toEqual([]);
		expect(setKey).not.toHaveBeenCalled();
	});
	it('removes the old key binding when the endpoint origin changes', async () => {
		const { settings, auth, removeKey } = setup();
		fireEvent.click(screen.getByRole('button', { name: 'Add Exa' }));
		fireEvent.change(screen.getByLabelText('Exa API key'), {
			target: { value: 'old-key' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Save connection' }));
		await waitFor(() => expect(settings.get().mcpServers).toHaveLength(1));
		const server = settings.get().mcpServers[0];
		if (!server) throw new Error('Missing saved connection');
		await saveConnection({
			server: { ...server, url: 'https://different.test/mcp' },
			values: {},
			settings,
			auth,
		});
		expect(removeKey).toHaveBeenCalled();
		expect(Object.values(auth.entries())).toHaveLength(0);
	});
});
