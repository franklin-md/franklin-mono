import type { SessionState } from '../../state/session.js';
import type { RuntimeBase } from '../types.js';

export type SessionRuntime = RuntimeBase<SessionState> & {
	// TODO: we should rename fork and child in runtimebase because. Maybe it becomes:
	// {state:{get,fork,child}}?
	// Then we can avoid naming conflicts with this SessionRuntime interface.
	session: {
		child(): Promise<SessionRuntime>;
		fork(): Promise<SessionRuntime>;
	};
};
