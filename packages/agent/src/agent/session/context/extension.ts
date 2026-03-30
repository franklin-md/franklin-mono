import type { CtxTracker } from '@franklin/mini-acp';
import type { Extension } from '@franklin/extensions';
import type { FranklinExtensionApi } from '@franklin/agent/browser';

/**
 * Tail extension that shadows the agent's Ctx state via a CtxTracker.
 *
 * Placed at the end of the extensions array so it sees final
 * transformed params after all other middleware. The tracker's
 * apply/append methods mirror the session adapter's mutations,
 * keeping both sides in lock-step.
 *
 * The tracker is owned by SessionManager, not the extension.
 */

// TODO: I think there is a bug here. We capture the ctx 'as seen by the agent', but we set it 'as seen by the client' during resume.
// TODO: It almost feels like we should not be exposing setContext as a hook in coreAPI....
// TODO: Maybe we put the tracker on the front side too? I think we might not even want to expose setContext as a command to the client at all!
export function ctxExtension(
	tracker: CtxTracker,
): Extension<FranklinExtensionApi> {
	return (api) => {
		api.on('setContext', (params) => {
			tracker.apply(params.ctx);
		});

		api.on('prompt', (params) => {
			tracker.append(params.message);
		});

		api.on('update', (event) => {
			tracker.append(event.message);
		});
	};
}
