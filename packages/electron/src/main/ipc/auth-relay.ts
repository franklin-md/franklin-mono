import type {
	AuthEntry,
	AuthChangeListener,
	IAuthManager,
} from '@franklin/agent';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProviders } from '@mariozechner/pi-ai/oauth';
import type { OAuthLoginCallbacks } from '@mariozechner/pi-ai/oauth';
import { ipcMain, shell } from 'electron';
import type { WebContents } from 'electron';

import {
	AUTH_GET_CANONICAL_PROVIDERS,
	AUTH_GET_API_KEY,
	AUTH_GET_PROVIDERS,
	AUTH_LOAD,
	AUTH_OPEN_EXTERNAL,
	AUTH_ON_CHANGE,
	AUTH_OAUTH_ON_AUTH,
	AUTH_OAUTH_ON_PROGRESS,
	AUTH_OAUTH_ON_PROMPT,
	AUTH_PROMPT_RESPONSE,
	AUTH_REMOVE_ENTRY,
	AUTH_SET_ENTRY,
	AUTH_START_LOGIN,
} from '../../shared/channels.js';

// ---------------------------------------------------------------------------
// AuthRelay
// ---------------------------------------------------------------------------

/**
 * Bridges renderer auth UI <-> main-process auth manager over Electron IPC.
 *
 * - Exposes simple CRUD operations (load / setEntry / removeEntry) as invoke handlers.
 * - Runs the full OAuth login flow in-process, forwarding each callback step
 *   to the renderer as a push event.  The renderer sends `AUTH_PROMPT_RESPONSE`
 *   back to unblock the `onPrompt` await.
 */
export class AuthRelay {
	/** Resolvers waiting for a promptResponse keyed by flowId. */
	private readonly promptResolvers = new Map<string, (value: string) => void>();
	private readonly unsubscribeAuthChange: () => void;

	constructor(
		private readonly webContents: WebContents,
		private readonly manager: IAuthManager,
	) {
		const authChangeListener: AuthChangeListener = (provider, authKey) => {
			this.webContents.send(AUTH_ON_CHANGE, provider, authKey);
		};
		this.unsubscribeAuthChange = this.manager.onAuthChange(authChangeListener);

		ipcMain.handle(AUTH_GET_PROVIDERS, () =>
			getOAuthProviders().map((p) => ({ id: p.id, name: p.name })),
		);
		ipcMain.handle(AUTH_GET_CANONICAL_PROVIDERS, () => getProviders());

		ipcMain.handle(AUTH_LOAD, () => this.manager.load());
		ipcMain.handle(AUTH_GET_API_KEY, (_e, provider: string) =>
			this.manager.getApiKey(provider),
		);

		ipcMain.handle(AUTH_SET_ENTRY, (_e, provider: string, entry: AuthEntry) =>
			this.manager.setEntry(provider, entry),
		);

		ipcMain.handle(AUTH_REMOVE_ENTRY, (_e, provider: string) =>
			this.manager.removeEntry(provider),
		);

		// Long-running invoke: resolves only when the OAuth flow completes.
		ipcMain.handle(AUTH_START_LOGIN, (_e, provider: string, flowId: string) =>
			this.runOAuthFlow(provider, flowId),
		);
		ipcMain.handle(AUTH_OPEN_EXTERNAL, (_e, url: string) =>
			shell.openExternal(url),
		);

		ipcMain.on(AUTH_PROMPT_RESPONSE, (_e, flowId: string, value: string) => {
			this.promptResolvers.get(flowId)?.(value);
		});
	}

	private async runOAuthFlow(
		provider: string,
		flowId: string,
	): Promise<{ success: boolean; error?: string }> {
		const callbacks: OAuthLoginCallbacks = {
			onAuth: (info) => {
				this.webContents.send(AUTH_OAUTH_ON_AUTH, flowId, info);
			},
			onPrompt: (prompt) => {
				this.webContents.send(AUTH_OAUTH_ON_PROMPT, flowId, prompt);
				return new Promise<string>((resolve) => {
					this.promptResolvers.set(flowId, resolve);
				});
			},
			onProgress: (message) => {
				this.webContents.send(AUTH_OAUTH_ON_PROGRESS, flowId, message);
			},
		};

		try {
			await this.manager.loginOAuth(provider as any, callbacks);
			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err),
			};
		} finally {
			this.promptResolvers.delete(flowId);
		}
	}

	dispose(): void {
		this.unsubscribeAuthChange();
		ipcMain.removeHandler(AUTH_GET_PROVIDERS);
		ipcMain.removeHandler(AUTH_GET_CANONICAL_PROVIDERS);
		ipcMain.removeHandler(AUTH_LOAD);
		ipcMain.removeHandler(AUTH_GET_API_KEY);
		ipcMain.removeHandler(AUTH_SET_ENTRY);
		ipcMain.removeHandler(AUTH_REMOVE_ENTRY);
		ipcMain.removeHandler(AUTH_START_LOGIN);
		ipcMain.removeHandler(AUTH_OPEN_EXTERNAL);
		ipcMain.removeAllListeners(AUTH_PROMPT_RESPONSE);
	}
}
