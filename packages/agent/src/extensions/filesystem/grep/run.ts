import type { ReconfigurableEnvironment } from '../../../modules/environment/api/types.js';
import { createBackend } from './backends/index.js';
import type { GrepBackendKind } from './backends/types.js';
import { formatGrepResult } from './format/result.js';
import type { GrepResult } from './format/types.js';
import { unavailableGrepResult } from './format/unavailable.js';
import type { GrepParams } from './tools.js';
import {
	GREP_SINGLE_PATH_MESSAGE,
	looksLikeMultipleAbsolutePaths,
} from './validate.js';

const RUN_TIMEOUT_MS = 10_000;

export type RunGrepResult = GrepResult;

export async function runGrep(
	backendKind: GrepBackendKind,
	params: GrepParams,
	env: ReconfigurableEnvironment,
): Promise<RunGrepResult> {
	const backend = createBackend(backendKind);
	if (!backend) {
		return unavailableGrepResult();
	}

	if (params.path && looksLikeMultipleAbsolutePaths(params.path)) {
		return {
			output: GREP_SINGLE_PATH_MESSAGE,
			isError: true,
		};
	}

	const target = params.path
		? await env.filesystem.resolve(params.path)
		: (await env.config()).fsConfig.cwd;

	const args = backend.args(params, target);

	const processOutput = await env.process.exec({
		file: backend.file,
		args,
		timeout: RUN_TIMEOUT_MS,
	});

	return formatGrepResult(processOutput, backend, params);
}
