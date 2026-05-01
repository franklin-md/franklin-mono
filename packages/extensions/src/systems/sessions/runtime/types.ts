import type { DeepPartial } from '@franklin/lib';
import type {
	BaseRuntimeSystem,
	InferRuntime,
	InferState,
} from '../../../algebra/system/types.js';
import type { BaseRuntime } from '../../../algebra/runtime/types.js';

export type Session<RT extends BaseRuntime> = {
	id: string;
	runtime: RT;
};

export type SessionEvent<RT extends BaseRuntime> =
	| { action: 'add'; id: string; runtime: RT }
	| { action: 'remove'; id: string; runtime: RT };

export type SessionCreateInput<RTS extends BaseRuntimeSystem> = {
	from?: string;
	mode?: 'child' | 'fork';
	overrides?: DeepPartial<InferState<RTS>>;
};

export type SessionCreate<RTS extends BaseRuntimeSystem> = (
	input?: SessionCreateInput<RTS>,
) => Promise<Session<InferRuntime<RTS>>>;
