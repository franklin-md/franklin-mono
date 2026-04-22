import type { Process } from '@franklin/lib';
import type { Extension } from '../../../algebra/types/index.js';
import type { CoreAPI } from '../../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import { detectGrepBackend, type GrepBackend } from './detect.js';
import { renderGrepInfo } from './render.js';
import { runGrep } from './run.js';
import { grepSpec } from './tools.js';

export function grepExtension(): Extension<CoreAPI<EnvironmentRuntime>> {
	return (api) => {
		let detection: Promise<GrepBackend> | null = null;
		const getBackend = (process: Process): Promise<GrepBackend> =>
			(detection ??= detectGrepBackend(process));

		api.on('systemPrompt', async (prompt, ctx) => {
			const backend = await getBackend(ctx.environment.process);
			prompt.setPart(renderGrepInfo(backend));
		});

		// TODO: the extension API does not support conditional/async tool
		// registration yet, so we always register `grep` and fail at call-time
		// when the detected backend is `none`. When conditional registration
		// lands, gate registration on `backend.kind !== 'none'` instead.
		api.registerTool(grepSpec, async (params, ctx) => {
			const backend = await getBackend(ctx.environment.process);
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
