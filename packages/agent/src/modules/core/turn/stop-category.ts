import { stopCategory } from '@franklin/mini-acp';
import { RuntimeStopCode } from './runtime-stop-code.js';
import type { AgentStopCode, AgentStopCategory } from './types.js';

export function agentStopCategory(code: AgentStopCode): AgentStopCategory {
	if (code === RuntimeStopCode.CompactionFailure) return 'runtime_error';
	return stopCategory(code);
}
