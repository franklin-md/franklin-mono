import type {
	StopCode,
	StopCategory,
	StreamEvent,
	TurnEnd,
} from '@franklin/mini-acp';
import type { RuntimeStopCode } from './runtime-stop-code.js';

export type AgentStopCode = StopCode | RuntimeStopCode;
export type AgentStopCategory = StopCategory | 'runtime_error';
export type AgentTurnEnd = Omit<TurnEnd, 'stopCode'> & {
	stopCode: AgentStopCode;
};
export type TurnStreamEvent =
	| Exclude<StreamEvent, { type: 'stepEnd' | 'turnEnd' }>
	| AgentTurnEnd;
