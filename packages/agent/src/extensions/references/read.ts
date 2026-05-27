import { z } from 'zod';
import type { CoreModule } from '../../modules/core/index.js';
import { toolSpec } from '../../modules/core/api/tool-spec.js';
import type { EnvironmentModule } from '../../modules/environment/index.js';
import type { ReferencesModule } from '../../modules/references/index.js';
import { defineExtension } from '../../modules/state/index.js';
import type { StoreModule } from '../../modules/store/index.js';
import { createFileControl } from '../filesystem/common/control.js';
import { fileKey } from '../filesystem/common/key.js';

const referenceReadFileDescription = 'Used to read content from a path.';

const referenceReadFileSchema = z.object({
	path: z.string().describe('Path or locator to read.'),
	selector: z
		.string()
		.optional()
		.describe(
			'Provider-specific selector. Supported formats are described by the current environment. (OPTIONAL)',
		),
});

export const referenceReadFileSpec = toolSpec(
	'read_file',
	referenceReadFileDescription,
	referenceReadFileSchema,
);

export const referenceReadExtension = defineExtension<
	[CoreModule, StoreModule, EnvironmentModule, ReferencesModule]
>((api) => {
	api.registerTool(referenceReadFileSpec, {
		// Keep the tool name and output shape aligned with filesystem read_file so
		// existing UI renderers can continue to render read results by tool name.
		execute: async ({ path, selector }, ctx) => {
			const context = await ctx.references.toContext({
				locator: path,
				selector,
			});

			if (!context.isError) {
				const file = createFileControl(ctx.getStore(fileKey));
				await file.markFileRead(ctx.environment.filesystem, path);
			}

			return {
				content: context.content,
				...(context.isError ? { isError: true } : {}),
			};
		},
	});
});
