import type { ManagedAgentError } from './shared.js';

export type ManagedAgentCommandResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			error: ManagedAgentError;
	  };
