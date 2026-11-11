import { defineExtension } from '../../../modules/state/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import type { StoreModule } from '../../../modules/store/index.js';
import { writeFile } from './run.js';
import { fileKey } from '../common/key.js';
import { writeFileSpec } from './tools.js';

export function writeExtension() {
	return defineExtension<[CoreModule, StoreModule, EnvironmentModule]>(
		(api) => {
			api.registerTool(writeFileSpec, {
				execute: async ({ path, content }, ctx) => {
					await writeFile({
						filesystem: ctx.environment.filesystem,
						store: ctx.getStore(fileKey),
						path,
						content,
					});
					return 'ok';
				},
			});
		},
	);
}
