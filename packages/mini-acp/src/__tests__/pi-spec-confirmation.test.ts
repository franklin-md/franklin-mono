import { getModel } from '@mariozechner/pi-ai';

import { createPiAgentFactory } from '../base/pi/factory.js';
import { confirmSpec } from '../spec-tester/confirm.js';
import { describeIfKey } from './utils/describe-if-key.js';

describeIfKey('OPENROUTER_API_KEY', 'pi-adapter spec confirmation', () => {
	const model = getModel('openrouter', 'z-ai/glm-5');
	confirmSpec(createPiAgentFactory(model), { timeoutMs: 60_000 });
});
