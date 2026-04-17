import type {
	BaseRuntimeSystem,
	InferRuntime,
} from '../../../algebra/system/index.js';
import type { Session } from './types.js';

// TODO: Can we make this alias transparent using Simplify?
export type SessionRuntime<RTS extends BaseRuntimeSystem> =
	InferRuntime<RTS> & {
		session: {
			child: () => Promise<Session<SessionRuntime<RTS>>>;
			fork: () => Promise<Session<SessionRuntime<RTS>>>;
			removeSelf: () => Promise<boolean>;
		};
	};
