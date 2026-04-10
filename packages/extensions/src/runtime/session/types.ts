import type { DeepPartial } from '@franklin/lib';
import type {
	InferRuntime,
	InferState,
	RuntimeSystem,
} from '../../runtime-system/types.js';
import type { RuntimeBase } from '../types.js';

export type Session<RT extends RuntimeBase<any>> = {
	id: string;
	runtime: RT;
};

export type SessionCreateInput<RTS extends RuntimeSystem<any, any, any>> = {
	from?: string;
	mode?: 'child' | 'fork';
	overrides?: DeepPartial<InferState<RTS>>;
};

export type SessionCreate<RTS extends RuntimeSystem<any, any, any>> = (
	input?: SessionCreateInput<RTS>,
) => Promise<Session<InferRuntime<RTS>>>;
