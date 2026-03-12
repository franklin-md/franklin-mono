import type { ManagedAgentCommand } from '../messages/command.js';
import type { ManagedAgentEvent } from '../messages/event.js';
import type { ManagedAgentCommandResult } from '../messages/result.js';

export type AdapterEventHandler = (event: ManagedAgentEvent) => void;

export interface AdapterOptions {
	onEvent: AdapterEventHandler;
}

export interface ManagedAgentAdapter {
	dispatch(command: ManagedAgentCommand): Promise<ManagedAgentCommandResult>;
	dispose(): Promise<void>;
}
