import { createExtension } from '../../algebra/index.js';
import type { CoreAPI } from '../../modules/core/index.js';
import type { EnvironmentRuntime } from '../../modules/environment/runtime.js';
import { concat } from './composers/concat.js';
import {
	type LoadedInstruction,
	loadInstructions,
} from './composers/loader.js';
import { createClaudeSpec } from './specs/claude.js';

export function createInstructionExtension() {
	return createExtension<[CoreAPI], [EnvironmentRuntime]>((api) => {
		const spec = createClaudeSpec();

		api.on('systemPrompt', (prompt, ctx) => {
			prompt.setPart(
				async () => {
					const env = ctx.environment;
					const fs = env.filesystem;
					const cwd = await env.config().then((config) => config.fsConfig.cwd);
					const instructions = await spec.collect(fs, cwd);
					const loaded = await loadInstructions(fs, instructions);
					return concat(loaded, { render: renderWithFilename });
				},
				{ once: true },
			);
		});
	});
}

function renderWithFilename(instruction: LoadedInstruction): string {
	return `# ${instruction.file}\n\n${instruction.content}`;
}
