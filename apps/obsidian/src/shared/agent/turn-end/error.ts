import type { AgentStopCode, AgentTurnEnd } from '@franklin/agent';

// Carries an unfinished turn end through runner and controller `catch` blocks,
// which own cancellation and stale-attempt handling. The stop code survives so
// failure views can render the same way Chat renders its turn ends.
export class TurnEndError extends Error {
	readonly stopCode: AgentStopCode;

	constructor({
		stopCode,
		stopMessage,
	}: Pick<AgentTurnEnd, 'stopCode' | 'stopMessage'>) {
		super(
			stopMessage ??
				`Model request failed (${stopCode}). Check model access and credentials, then retry.`,
		);
		this.name = 'TurnEndError';
		this.stopCode = stopCode;
	}
}
