import type { Fixture } from '../types.js';
import { initialize } from '../actions/initialize.js';
import { setContext } from '../actions/set-context.js';
import { prompt } from '../actions/prompt.js';
import { VALID_LLM_CONFIG_PLACEHOLDER } from '../../__tests__/utils/llm-config.js';

export const unknownModel: Fixture = {
	name: 'unknown-model',
	actions: [
		initialize(),
		setContext({
			config: {
				...VALID_LLM_CONFIG_PLACEHOLDER,
				model: 'nonexistent-model',
			},
		}),
		prompt('Hello'),
	],
};
