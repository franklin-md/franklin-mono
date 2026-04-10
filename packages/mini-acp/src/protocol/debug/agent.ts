import type { MuAgent } from '../types.js';

import { renderThrown, renderToolExecute, renderToolResult } from './render.js';
import { line } from './style.js';

export function debugAgent(agent: MuAgent, label: string): MuAgent {
	return {
		async toolExecute(params: Parameters<MuAgent['toolExecute']>[0]) {
			console.log(line(label, renderToolExecute(params)));

			try {
				const result = await agent.toolExecute(params);
				console.log(line(label, renderToolResult(params.call.name, result)));
				return result;
			} catch (error) {
				console.log(
					line(label, renderThrown(`toolExecute ${params.call.name}`, error)),
				);
				throw error;
			}
		},
	};
}
