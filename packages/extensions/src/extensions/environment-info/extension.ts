import type { Extension } from '../../algebra/index.js';
import type { CoreAPI } from '../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../systems/environment/runtime.js';
import { renderEnvironmentInfo } from './render.js';
import { renderCurrentDate } from './render-date.js';

export interface EnvironmentInfoOptions {
	now?: () => Date;
}

export function createEnvironmentInfoExtension(
	opts: EnvironmentInfoOptions = {},
): Extension<CoreAPI<EnvironmentRuntime>> {
	const now = opts.now ?? (() => new Date());

	return (api) => {
		let staticLoaded = false;

		api.on('systemPrompt', async (prompt, ctx) => {
			if (staticLoaded) return;
			const env = ctx.environment;
			const [platform, osVersion, shell, homeDir, config] = await Promise.all([
				env.osInfo.getPlatform(),
				env.osInfo.getOsVersion(),
				env.osInfo.getShellInfo(),
				env.osInfo.getHomeDir(),
				env.config(),
			]);
			prompt.setPart(
				renderEnvironmentInfo({
					platform,
					osVersion,
					shell,
					homeDir,
					cwd: config.fsConfig.cwd,
				}),
			);
			staticLoaded = true;
		});

		api.on('systemPrompt', (prompt) => {
			prompt.setPart(renderCurrentDate(now()));
		});
	};
}
