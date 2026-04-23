import type { LoopbackListener, PkceParams } from '@franklin/lib';

import type { OAuthCredentials } from '../credentials.js';
import type { AuthorizationCodePkceSpec } from '../specs/types.js';
import { classifyCallback } from './classify.js';

/**
 * Wait for the loopback listener to receive a valid OAuth callback.
 *
 * Resolves with the authorization code on a matched `success` outcome,
 * rejects on the first `error` outcome, and keeps waiting on `ignore`
 * outcomes (e.g. `/favicon.ico` side-requests). Honors AbortSignal
 * both pre- and post-subscription.
 */
export function awaitAuthorizationCode<TCreds extends OAuthCredentials>(
	listener: LoopbackListener,
	pkce: PkceParams,
	spec: AuthorizationCodePkceSpec<TCreds>,
	signal: AbortSignal | undefined,
): Promise<{ code: string }> {
	return new Promise<{ code: string }>((resolve, reject) => {
		let unsubscribeRequest: (() => void) | null = null;

		function cleanup(): void {
			unsubscribeRequest?.();
			signal?.removeEventListener('abort', onAbort);
		}

		function onAbort(): void {
			cleanup();
			const reason: unknown = signal?.reason;
			reject(
				reason instanceof Error
					? reason
					: new DOMException('Aborted', 'AbortError'),
			);
		}

		unsubscribeRequest = listener.onRequest((request) => {
			const outcome = classifyCallback(request, pkce, spec);
			void listener.respond(request.id, outcome.response);
			if (outcome.kind === 'ignore') return;
			cleanup();
			if (outcome.kind === 'success') resolve({ code: outcome.code });
			else reject(outcome.error);
		});

		if (signal?.aborted) {
			onAbort();
			return;
		}
		signal?.addEventListener('abort', onAbort);
	});
}
