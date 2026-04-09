import type { SessionRuntime } from '../../runtime/session/runtime.js';

export type SessionAPI = {
	getSession(): SessionRuntime;
};
