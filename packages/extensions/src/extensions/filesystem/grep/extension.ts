import type { Extension } from '../../../algebra/types/index.js';
import type { CoreAPI } from '../../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import { detectGrepBackend } from './detect.js';
import { renderGrepInfo } from './guidance.js';
import { runGrep } from './run.js';
import { grepSpec } from './tools.js';

export function grepExtension(): Extension<CoreAPI<EnvironmentRuntime>> {
	return (api) => {
		api.on('systemPrompt', async (prompt, ctx) => {
			const backend = await detectGrepBackend(ctx.environment.process);
			prompt.setPart(renderGrepInfo(backend));
		});

		// TODO: the extension API does not support conditional/async tool
		// registration yet, so we always register `grep` and fail at call-time
		// when the detected backend is `none`. When conditional registration
		// lands, gate registration on `backend.kind !== 'none'` instead.
		api.registerTool(grepSpec, async (params, ctx) => {
			const backend = await detectGrepBackend(ctx.environment.process);
			const { output, isError } = await runGrep(
				backend,
				params,
				ctx.environment,
			);
			if (isError) {
				return {
					content: [{ type: 'text', text: output }],
					isError: true,
				};
			}
			return output;
		});
	};
}
