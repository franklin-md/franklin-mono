export type {
	CodexTransport,
	CodexProcessTransportOptions,
	CodexDirectTransportOptions,
	CodexTransportOptions,
	CodexDirectClient,
	CodexDirectThread,
} from './types.js';
export { CodexProcessTransport } from './process.js';
export { CodexDirectTransport } from './direct.js';

import type { CodexTransportOptions } from './types.js';
import type { AdapterEventHandler } from '../../types.js';
import { CodexProcessTransport } from './process.js';
import { CodexDirectTransport } from './direct.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCodexTransport(
	options: CodexTransportOptions | undefined,
	onEvent: AdapterEventHandler,
): CodexProcessTransport | CodexDirectTransport {
	if (options?.kind === 'direct') {
		const transport = new CodexDirectTransport(options);
		transport.onEvent = onEvent;
		return transport;
	}

	// kind is either 'process' or undefined — both are valid process options
	const transport = new CodexProcessTransport(options);
	transport.onEvent = onEvent;
	return transport;
}
