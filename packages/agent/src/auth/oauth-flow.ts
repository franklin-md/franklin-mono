import type {
	OAuthCredentials,
	OAuthLoginCallbacks,
} from '@mariozechner/pi-ai/oauth';
import { createObserver } from '@franklin/lib';

import type { OAuthAuthInfo, OAuthPrompt } from './types.js';

// TODO: This interactive flow primitive is fairly general and may belong in a
// core auth folder rather than under the agent auth manager.
export class OAuthFlow {
	private authObserver = createObserver<[OAuthAuthInfo]>();
	private progressObserver = createObserver<[string]>();
	private promptObserver = createObserver<[OAuthPrompt]>();
	private promptState:
		| {
				resolve(value: string): void;
				reject(error: Error): void;
		  }
		| undefined;
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

	onPrompt(listener: (prompt: OAuthPrompt) => void): () => void {
		return this.promptObserver.subscribe(listener);
	}

	async respond(value: string): Promise<void> {
		if (!this.promptState) {
			throw new Error('No OAuth prompt is pending');
		}

		const promptState = this.promptState;
		this.promptState = undefined;
		promptState.resolve(value);
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
			onPrompt: (prompt) => {
				this.promptObserver.notify(prompt);

				return new Promise<string>((resolve, reject) => {
					this.promptState = { resolve, reject };
				});
			},
		};

		this.loginPromise = this.run(callbacks).finally(() => {
			this.rejectPrompt(
				new Error('OAuth flow ended before the pending prompt was resolved'),
			);
			this.loginPromise = null;
		});

		return this.loginPromise;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.resetObservers();
		this.rejectPrompt(new Error('OAuth flow disposed'));
		await this.loginPromise?.catch(() => {});
	}

	private resetObservers(): void {
		this.authObserver = createObserver<[OAuthAuthInfo]>();
		this.progressObserver = createObserver<[string]>();
		this.promptObserver = createObserver<[OAuthPrompt]>();
	}

	private rejectPrompt(error: Error): void {
		if (!this.promptState) return;

		const promptState = this.promptState;
		this.promptState = undefined;
		promptState.reject(error);
	}
}
