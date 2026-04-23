import type { Net } from '../../platform.js';
import { OAuthClient } from '../oauth-client.js';

import { anthropicSpec } from './anthropic.js';
import { openaiCodexSpec } from './openai-codex.js';
import type { AuthorizationCodePkceSpec } from './types.js';

export const BUILT_IN_SPECS: AuthorizationCodePkceSpec[] = [
	anthropicSpec,
	openaiCodexSpec,
];

export function createBuiltInOAuthClient(net: Net): OAuthClient {
	return new OAuthClient(
		new Map(BUILT_IN_SPECS.map((spec) => [spec.id, spec])),
		net,
	);
}
