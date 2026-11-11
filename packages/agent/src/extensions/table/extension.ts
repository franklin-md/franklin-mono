import { defineExtension } from '../../modules/state/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { EnvironmentModule } from '../../modules/environment/index.js';
import type { StoreModule } from '../../modules/store/index.js';
import { fileKey } from '../filesystem/common/key.js';
import { sha256Hex } from '../filesystem/hash.js';
import { writeFile } from '../filesystem/write/run.js';
import { renderTable } from './render.js';
import { writeTableSpec } from './tools.js';

/** Install alongside the filesystem editing tools, which own seen-file bookkeeping. */
export function tableExtension() {
	return defineExtension<[CoreModule, EnvironmentModule, StoreModule]>(
		(api) => {
			api.registerTool(writeTableSpec, {
				async execute(input, ctx, invocation) {
					const result = renderTable(input);
					const fs = ctx.environment.filesystem;
					const path = await fs.resolve(input.path);
					invocation?.signal.throwIfAborted();
					if (await fs.exists(path))
						throw new Error(
							'Table destination exists. Read and inspect it before editing or choosing another path.',
						);
					const slash = input.path.lastIndexOf('/');
					if (slash > 0)
						await fs.mkdir(await fs.resolve(input.path.slice(0, slash)), {
							recursive: true,
						});
					invocation?.signal.throwIfAborted();
					await writeFile({
						filesystem: fs,
						store: ctx.getStore(fileKey),
						path: input.path,
						content: result.content,
					});
					try {
						const actual = await fs.readFile(path);
						if (
							sha256Hex(actual) !==
							sha256Hex(new TextEncoder().encode(result.content))
						)
							throw new Error('Content differs');
					} catch {
						throw new Error(
							`Table was written to ${input.path}, but verification failed. Inspect the existing file before retrying.`,
						);
					}
					return {
						path,
						format: input.format,
						rowCount: input.rows.length,
						bytes: result.bytes,
						datasetHash: result.datasetHash,
						warnings: result.warnings,
					};
				},
			});
		},
	);
}
