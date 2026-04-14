import type { Fixture } from '../types.js';
import { initialize } from '../actions/initialize.js';
import { setContext } from '../actions/set-context.js';
import { prompt } from '../actions/prompt.js';
import { cancel } from '../actions/cancel.js';
import { waitFor } from '../actions/wait-for.js';
import { VALID_LLM_CONFIG_PLACEHOLDER } from '../../__tests__/utils/llm-config.js';

export const overlappingPrompts: Fixture = {
	name: 'overlapping-prompts',
	actions: [
		initialize(),
		setContext({ config: VALID_LLM_CONFIG_PLACEHOLDER }),
		prompt('first'),
		waitFor((e) => e.direction === 'receive' && e.method === 'turnStart'),
		prompt('second'),
		waitFor(
			(e) =>
				e.direction === 'receive' &&
				e.method === 'error' &&
				e.params.operation === 'prompt',
		),
		cancel(),
		waitFor((e) => e.direction === 'receive' && e.method === 'turnEnd'),
	],
};
