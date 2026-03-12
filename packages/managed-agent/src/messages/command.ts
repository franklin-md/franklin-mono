import type { InputItem } from './input.js';
import type { PermissionDecision } from './permission.js';
import type { SessionRef, SessionSpec } from './session.js';

export type ManagedAgentCommand =
	| {
			type: 'session.start';
			spec: SessionSpec;
	  }
	| {
			type: 'session.resume';
			ref: SessionRef;
	  }
	| {
			type: 'session.fork';
			ref: SessionRef;
			spec?: Partial<SessionSpec>;
	  }
	| {
			type: 'turn.start';
			input: InputItem[];
	  }
	| {
			type: 'turn.interrupt';
	  }
	| {
			type: 'permission.resolve';
			decision: PermissionDecision;
	  };
