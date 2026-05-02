import { createExtension } from '../../algebra/index.js';
import type { CoreAPI } from '../../modules/core/index.js';
import type { EnvironmentRuntime } from '../../modules/environment/runtime.js';
import { renderEnvironmentInfo } from './render.js';
import { renderCurrentDate } from './render-date.js';
import { renderEnvironmentPermissions } from './render-permissions.js';

export interface EnvironmentInfoOptions {
	now?: () => Date;
}

export function createEnvironmentInfoExtension(
	opts: EnvironmentInfoOptions = {},
) {
	const now = opts.now ?? (() => new Date());

	return createExtension<[CoreAPI], [EnvironmentRuntime]>((api) => {
		api.on('systemPrompt', (prompt, ctx) => {
			prompt.setPart(
				async () => {
					const env = ctx.environment;
					const [platform, osVersion, shell, homeDir, config] =
						await Promise.all([
							env.osInfo.getPlatform(),
							env.osInfo.getOsVersion(),
							env.osInfo.getShellInfo(),
							env.osInfo.getHomeDir(),
							env.config(),
						]);
					return renderEnvironmentInfo({
						platform,
						osVersion,
						shell,
						homeDir,
						cwd: config.fsConfig.cwd,
					});
				},
				{ once: true },
			);
		});

		api.on('systemPrompt', (prompt, ctx) => {
			prompt.setPart(async () => {
				const config = await ctx.environment.config();
				return renderEnvironmentPermissions({
					filesystem: config.fsConfig.permissions,
					network: config.netConfig,
				});
			});
		});

		api.on('systemPrompt', (prompt) => {
			prompt.setPart(renderCurrentDate(now()));
		});
	});
}
