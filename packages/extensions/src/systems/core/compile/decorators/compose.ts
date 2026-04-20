import type { ProtocolDecorator } from './types.js';

export function compose(
	stack: readonly ProtocolDecorator[],
): ProtocolDecorator {
	return {
		name: 'composed',
		async server(base) {
			let server = base;
			for (const d of stack) server = await d.server(server);
			return server;
		},
		async client(base) {
			let client = base;
			for (const d of stack.toReversed()) client = await d.client(client);
			return client;
		},
	};
}
