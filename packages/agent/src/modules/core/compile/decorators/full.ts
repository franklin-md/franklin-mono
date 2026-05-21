import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { CoreSignature } from '../../api/api.js';
import type { MutableSession } from '../../session/index.js';
import { compose } from './compose.js';
import { createPromptDecorator } from './prompt/index.js';
import { createToolDecorator } from './tool/index.js';
import { createTrackingDecorator } from './tracking/index.js';
import type { ProtocolDecorator } from './types.js';

/**
 * Turn core extension registrations into the ordered `ProtocolDecorator` stack
 * composed around the connected Mini-ACP client/server pair. Prompt-time
 * extension hooks are deliberately grouped so the client path reads as one
 * lifecycle: sync system prompt, build user prompt, send, then observe stream.
 */
export function createAgentDecorator<Runtime extends BaseRuntime>(
	session: MutableSession,
	registrations: RegistryView<CoreSignature, Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator {
	return compose(
		[
			createPromptDecorator(session, registrations, getCtx),
			createToolDecorator(registrations, getCtx),
			createTrackingDecorator(session),
		].filter(isProtocolDecorator),
	);
}

function isProtocolDecorator(
	decorator: ProtocolDecorator | undefined,
): decorator is ProtocolDecorator {
	return decorator !== undefined;
}
