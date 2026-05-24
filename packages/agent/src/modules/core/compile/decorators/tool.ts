import type { MiniACPAgent } from '@franklin/mini-acp';
import type { ToolRegistry } from '../../tools/index.js';
import type { ProtocolDecorator } from './types.js';

export function createToolDecorator(
	registry: ToolRegistry,
): ProtocolDecorator | undefined {
	if (!registry.hasRegistrations()) return undefined;

	return {
		name: 'tool',
		async server(server): Promise<MiniACPAgent> {
			const toolExecute: MiniACPAgent['toolExecute'] = (params) =>
				registry.dispatch(params, (nextParams) =>
					server.toolExecute(nextParams),
				);

			return {
				...server,
				toolExecute,
			};
		},
		async client(c) {
			return c;
		},
	};
}
