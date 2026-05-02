import { createExtension } from '../../../algebra/index.js';
import type { CoreAPI } from '../../../modules/core/index.js';
import type { EnvironmentRuntime } from '../../../modules/environment/runtime.js';
import { detectGrepBackend } from './detect.js';
import { renderGrepInfo } from './guidance.js';
import { runGrep } from './run.js';
import { grepSpec } from './tools.js';

export function grepExtension() {
	return createExtension<[CoreAPI], [EnvironmentRuntime]>((api) => {
		api.on('systemPrompt', (prompt, ctx) => {
			prompt.setPart(
				async () => {
					const backendKind = await detectGrepBackend(ctx.environment.process);
					return renderGrepInfo(backendKind);
				},
				{ once: true },
			);
		});

		// TODO: the extension API does not support conditional/async tool
		// registration yet, so we always register `grep` and fail at call-time
		// when the detected backend is `none`. When conditional registration
		// lands, gate registration on `backend.kind !== 'none'` instead.
		api.registerTool(grepSpec, async (params, ctx) => {
			const backendKind = await detectGrepBackend(ctx.environment.process);
			const { output, isError } = await runGrep(
				backendKind,
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
	});
}
