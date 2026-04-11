import type { MuAgent } from '../types.js';

import { renderThrown, renderToolExecute, renderToolResult } from './render.js';
import { logLines } from './style.js';

export function debugAgent(agent: MuAgent, label: string): MuAgent {
	return {
		async toolExecute(params: Parameters<MuAgent['toolExecute']>[0]) {
			logLines(label, renderToolExecute(params));

			try {
				const result = await agent.toolExecute(params);
				logLines(label, renderToolResult(params.call.name, result));
				return result;
			} catch (error) {
				logLines(
					label,
					renderThrown(`toolExecute ${params.call.name}`, error, 2),
				);
				throw error;
			}
		},
	};
}
