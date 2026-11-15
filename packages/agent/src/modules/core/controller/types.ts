import type {
	MiniACPAgent,
	MiniACPClientHandle,
	UserMessage,
} from '@franklin/mini-acp';
import type { CoreInspectDump } from '../inspect-dump.js';
import type { SessionSnapshot } from '../state.js';

import type { TurnStreamEvent } from '../turn/types.js';

export type AgentClient = Omit<MiniACPClientHandle, 'prompt' | 'continue'> & {
	prompt(message: UserMessage): AsyncIterable<TurnStreamEvent>;
};

export type AgentController = {
	readonly server: MiniACPAgent;
	bind(client: MiniACPClientHandle): AgentClient;
	setToolEnabled(name: string, enabled: boolean): boolean;
	getSession(): SessionSnapshot;
	compact(): Promise<boolean>;
	inspect(): CoreInspectDump;
};
