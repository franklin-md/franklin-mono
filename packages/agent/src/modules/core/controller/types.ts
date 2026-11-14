import type {
	MiniACPAgent,
	MiniACPClientHandle,
	StreamEvent,
	UserMessage,
} from '@franklin/mini-acp';
import type { CoreInspectDump } from '../inspect-dump.js';
import type { SessionSnapshot } from '../state.js';

export type TurnStreamEvent = Exclude<StreamEvent, { type: 'stepEnd' }>;

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
