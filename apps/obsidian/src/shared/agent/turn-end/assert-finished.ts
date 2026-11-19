import type { AgentTurnEnd } from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';
import { TurnEndError } from './error.js';

export function assertFinished(turnEnd: AgentTurnEnd): void {
	if (turnEnd.stopCode !== StopCode.Finished) throw new TurnEndError(turnEnd);
}
