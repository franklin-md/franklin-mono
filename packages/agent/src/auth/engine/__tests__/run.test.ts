import type {
	Fetch,
	ListenLoopbackOptions,
	LoopbackListener,
	LoopbackRequest,
	LoopbackResponse,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import type { Net } from '../../../platform.js';
import type { AuthorizationCodePkceSpec } from '../../specs/types.js';
import { runAuthorizationCodePkce } from '../run.js';

type EmittedRequest = {
	request: LoopbackRequest;
	responses: LoopbackResponse[];
};

class FakeListener implements LoopbackListener {
	private readonly subscribers = new Set<(request: LoopbackRequest) => void>();
	private readonly pending: LoopbackRequest[] = [];
	readonly emitted: EmittedRequest[] = [];
	disposed = false;
	host = '127.0.0.1';
	boundPort = 9999;
	path: string;

	constructor(path: string) {
		this.path = path;
	}

	async getRedirectUri(): Promise<string> {
		return `http://${this.host}:${this.boundPort}${this.path}`;
	}

	onRequest(callback: (request: LoopbackRequest) => void): () => void {
		this.subscribers.add(callback);
		const buffered = this.pending.splice(0, this.pending.length);
		for (const request of buffered) callback(request);
		return () => this.subscribers.delete(callback);
	}

	async respond(id: string, response: LoopbackResponse): Promise<void> {
		const record = this.emitted.find((e) => e.request.id === id);
		if (record) record.responses.push(response);
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.subscribers.clear();
	}

	simulate(query: string, id = 'req-1'): void {
		this.simulateUrl(`${this.path}${query}`, id);
	}

	simulateUrl(pathAndQuery: string, id = 'req-1'): void {
		const request: LoopbackRequest = {
			id,
			method: 'GET',
			url: `http://${this.host}:${this.boundPort}${pathAndQuery}`,
			headers: {},
		};
		this.emitted.push({ request, responses: [] });
		if (this.subscribers.size === 0) {
			this.pending.push(request);
			return;
		}
		for (const sub of this.subscribers) sub(request);
	}
}

function makeSpec(
	overrides: Partial<AuthorizationCodePkceSpec> = {},
): AuthorizationCodePkceSpec {
	return {
		id: 'test',
		name: 'Test Provider',
		loopback: { path: '/callback' },
		redirectUri: 'http://localhost:9999/callback',
		buildAuthUrl: (pkce, redirectUri) =>
			`https://provider.example/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&challenge=${pkce.challenge}&state=${pkce.state}`,
		exchangeCode: vi.fn(async () => ({
			access: 'access-token',
			refresh: 'refresh-token',
			expires: 123,
		})),
		refresh: vi.fn(async () => {
			throw new Error('not used');
		}),
		getApiKey: (creds) => creds.access,
		...overrides,
	};
}

function makeNet(
	listener: FakeListener,
	fetch: Fetch = vi.fn(async () => {
		throw new Error('fetch not expected');
	}),
): Net {
	return {
		listenLoopback: async (options?: ListenLoopbackOptions) => {
			if (options?.path) listener.path = options.path;
			return listener;
		},
		fetch,
	};
}

describe('runAuthorizationCodePkce', () => {
	it('emits onAuth with an authorize URL and exchanges the code on success', async () => {
		const listener = new FakeListener('/callback');
		const spec = makeSpec();
		const onAuth = vi.fn();
		const onProgress = vi.fn();

		const promise = runAuthorizationCodePkce(spec, makeNet(listener), {
			onAuth,
			onProgress,
		});

		// Wait a tick so the engine can subscribe before simulating the request.
		await vi.waitFor(() => expect(onAuth).toHaveBeenCalled());

		expect(onAuth).toHaveBeenCalledTimes(1);
		const firstCall = onAuth.mock.calls[0]!;
		const { url } = firstCall[0] as { url: string };
		const state = new URL(url).searchParams.get('state')!;
		expect(state).toBeTruthy();

		listener.simulate(`?code=auth-code&state=${state}`);
		const credentials = await promise;

		expect(credentials).toMatchObject({ access: 'access-token' });
		expect(onProgress).toHaveBeenCalledWith(
			expect.stringContaining('Exchanging authorization code'),
		);
		expect(spec.exchangeCode).toHaveBeenCalledWith(
			'auth-code',
			expect.any(String),
			'http://localhost:9999/callback',
			expect.any(Function),
		);
		expect(listener.disposed).toBe(true);
	});

	it('ignores unmatched paths and resolves when the callback path matches', async () => {
		const listener = new FakeListener('/callback');
		const spec = makeSpec();
		const onAuth = vi.fn();

		const promise = runAuthorizationCodePkce(spec, makeNet(listener), {
			onAuth,
		});
		await vi.waitFor(() => expect(onAuth).toHaveBeenCalled());

		const firstCall = onAuth.mock.calls[0]!;
		const { url } = firstCall[0] as { url: string };
		const state = new URL(url).searchParams.get('state')!;

		// Emit a favicon request first — engine should 404 it and keep waiting.
		listener.simulateUrl('/favicon.ico', 'fav');
		listener.simulate(`?code=auth-code&state=${state}`);
		await expect(promise).resolves.toBeDefined();

		// The favicon request got a 404 response.
		const faviconRec = listener.emitted.find((e) => e.request.id === 'fav')!;
		expect(faviconRec.responses[0]?.status).toBe(404);
	});

	it('rejects when the callback carries an ?error param', async () => {
		const listener = new FakeListener('/callback');
		const spec = makeSpec();
		// Buffered simulate: engine picks up the pending request on subscription.
		listener.simulate(`?error=access_denied&error_description=User%20declined`);

		const promise = runAuthorizationCodePkce(spec, makeNet(listener), {
			onAuth: vi.fn(),
		});

		await expect(promise).rejects.toThrow(/User declined/);
		expect(listener.disposed).toBe(true);
	});

	it('rejects when state does not match', async () => {
		const listener = new FakeListener('/callback');
		const spec = makeSpec();
		listener.simulate(`?code=auth-code&state=wrong-state`);

		const promise = runAuthorizationCodePkce(spec, makeNet(listener), {
			onAuth: vi.fn(),
		});

		await expect(promise).rejects.toThrow(/state mismatch/i);
	});

	it('rejects when code or state is missing', async () => {
		const listener = new FakeListener('/callback');
		const spec = makeSpec();
		listener.simulate(`?state=some-state`);

		const promise = runAuthorizationCodePkce(spec, makeNet(listener), {
			onAuth: vi.fn(),
		});

		await expect(promise).rejects.toThrow(/missing code or state/i);
	});

	it('uses spec.validateState override when provided (Anthropic-style verifier-as-state)', async () => {
		const listener = new FakeListener('/callback');
		const onAuth = vi.fn();
		const spec = makeSpec({
			buildAuthUrl: (pkce, redirectUri) =>
				`https://p.example/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&state=${pkce.verifier}`,
			validateState: (expected, received) => received === expected.verifier,
		});

		const promise = runAuthorizationCodePkce(spec, makeNet(listener), {
			onAuth,
		});
		await vi.waitFor(() => expect(onAuth).toHaveBeenCalled());

		const firstCall = onAuth.mock.calls[0]!;
		const { url } = firstCall[0] as { url: string };
		const verifierState = new URL(url).searchParams.get('state')!;

		listener.simulate(`?code=auth-code&state=${verifierState}`);

		await expect(promise).resolves.toMatchObject({ access: 'access-token' });
	});

	it('aborts the pending callback wait and disposes the listener when the signal fires', async () => {
		const listener = new FakeListener('/callback');
		const spec = makeSpec();
		const controller = new AbortController();

		const promise = runAuthorizationCodePkce(
			spec,
			makeNet(listener),
			{ onAuth: vi.fn() },
			controller.signal,
		);

		// Let the engine bind its listener before we abort.
		await vi.waitFor(() => expect(listener.disposed).toBe(false));

		controller.abort();

		await expect(promise).rejects.toThrow(/abort/i);
		expect(listener.disposed).toBe(true);
	});

	it('rejects immediately when the signal is already aborted', async () => {
		const listener = new FakeListener('/callback');
		const spec = makeSpec();
		const controller = new AbortController();
		controller.abort();

		const promise = runAuthorizationCodePkce(
			spec,
			makeNet(listener),
			{ onAuth: vi.fn() },
			controller.signal,
		);

		await expect(promise).rejects.toThrow(/abort/i);
	});
});
