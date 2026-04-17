import type { LLMConfig } from '../../types/context.js';
import { StopCode } from '../../types/stop-code.js';
import type { ResolveResult } from './model/resolve.js';
import { resolveModel } from './model/resolve.js';

export function resolveConfig(config: LLMConfig): ResolveResult {
	const modelResult = resolveModel(config);
	if (!modelResult.ok) {
		return modelResult;
	}

	if (!config.apiKey) {
		return {
			ok: false,
			turnEnd: {
				type: 'turnEnd',
				stopCode: StopCode.AuthKeyNotSpecified,
				stopMessage: 'Missing auth key in ctx.config',
			},
		};
	}

	return modelResult;
}
