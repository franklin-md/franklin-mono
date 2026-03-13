import type { StdioTransportOptions } from '../transport/index.js';

import { claudeAgentSpec } from './claude.js';
import { codexAgentSpec } from './codex.js';

export { claudeAgentSpec } from './claude.js';
export { codexAgentSpec } from './codex.js';

export const commonAgentSpecs = {
	'claude-acp': claudeAgentSpec,
	codex: codexAgentSpec,
} satisfies Record<string, StdioTransportOptions>;
