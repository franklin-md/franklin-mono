import type { Extension } from '../../algebra/index.js';
import type { CoreAPI } from '../../systems/core/index.js';
import type { EnvironmentAPI } from '../../systems/environment/index.js';
import { createClaudeSpec } from './specs/claude.js';
import {
	loadInstructions,
	type LoadedInstruction,
} from './composers/loader.js';
import { concat } from './composers/concat.js';

export function createInstructionExtension(): Extension<
	CoreAPI & EnvironmentAPI
> {
	return (api) => {
		const env = api.getEnvironment();
		const fs = api.getEnvironment().filesystem;
		let hasLoaded = false;

		const spec = createClaudeSpec();

		api.on('systemPrompt', async (ctx) => {
			// Only load once per conversation.
			if (hasLoaded) return;
			// TODO: How do we actually figure out if this is the first in the converstion VS first since hydration?

			const cwd = await env.config().then((config) => config.fsConfig.cwd);
			const instructions = await spec.collect(fs, cwd);
			const loaded = await loadInstructions(fs, instructions);
			const rendered = concat(loaded, {
				render: renderWithFilename,
			});

			// TODO: General and configurable algorithm for composition
			ctx.setPart(rendered);

			hasLoaded = true;
		});
	};
}

function renderWithFilename(instruction: LoadedInstruction): string {
	return `# ${instruction.file}\n\n${instruction.content}`;
}
