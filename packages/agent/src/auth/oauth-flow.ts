import { createObserver } from '@franklin/lib';

import type { OAuthCredentials } from './credentials.js';
import type { OAuthAuthInfo, OAuthLoginCallbacks } from './types.js';

// TODO: This interactive flow primitive is fairly general and may belong in a
// core auth folder rather than under the agent auth manager.
export class OAuthFlow {
	private authObserver = createObserver<[OAuthAuthInfo]>();
	private progressObserver = createObserver<[string]>();
	private loginPromise: Promise<OAuthCredentials> | null = null;
	private started = false;
	private disposed = false;

	constructor(
		private readonly run: (
			callbacks: OAuthLoginCallbacks,
		) => Promise<OAuthCredentials>,
	) {}

	onAuth(listener: (info: OAuthAuthInfo) => void): () => void {
		return this.authObserver.subscribe(listener);
	}

	onProgress(listener: (message: string) => void): () => void {
		return this.progressObserver.subscribe(listener);
	}

	async login(): Promise<OAuthCredentials> {
		if (this.disposed) {
			throw new Error('OAuth flow has been disposed');
		}
		if (this.loginPromise) {
			return this.loginPromise;
		}
		if (this.started) {
			throw new Error('OAuth flow can only be started once');
		}

		this.started = true;

		const callbacks: OAuthLoginCallbacks = {
			onAuth: (info) => {
				this.authObserver.notify(info);
			},
			onProgress: (message) => {
				this.progressObserver.notify(message);
			},
		};

		this.loginPromise = this.run(callbacks).finally(() => {
			this.loginPromise = null;
		});

		return this.loginPromise;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.resetObservers();
		await this.loginPromise?.catch(() => {});
	}

	private resetObservers(): void {
		this.authObserver = createObserver<[OAuthAuthInfo]>();
		this.progressObserver = createObserver<[string]>();
	}
}
