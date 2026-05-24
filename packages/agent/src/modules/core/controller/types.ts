import type { MiniACPAgent, MiniACPClientHandle } from '@franklin/mini-acp';
import type { CoreInspectDump } from '../inspect-dump.js';
import type { SessionSnapshot } from '../state.js';

export type AgentController = {
	readonly server: MiniACPAgent;
	bind(client: MiniACPClientHandle): MiniACPClientHandle;
	setToolEnabled(name: string, enabled: boolean): boolean;
	getSession(): SessionSnapshot;
	inspect(): CoreInspectDump;
};
