import {
	createDuckDuckGoWebSearchProvider,
	createExaWebSearchProvider,
	createWebExtension,
	defineExtension,
	filesystemBundle,
	referenceReadExtension,
	webSearchProviders,
} from '@franklin/agent';
import type {
	FranklinExtension,
	CoreModule,
	EnvironmentModule,
	StoreModule,
} from '@franklin/agent';
import { createObsidianReferenceExtensions } from '../../../shared/agent/references.js';

type Options = {
	vaultName: string;
};

export function createInboxResearchExtensions({
	vaultName,
}: Options): FranklinExtension[] {
	return [
		defineExtension<[CoreModule, EnvironmentModule, StoreModule]>((api) => {
			// Reference-backed reads record file hashes. Register their existing key
			// without adding edit_file just to obtain its initializer. The runner's
			// StoreRegistry has no persistence adapter: file hashes die with it.
			// See packages/agent/README.md and extensions/references/read.ts.
			api.registerStore(filesystemBundle.keys.file, {}, 'private');
			api.on('systemPrompt', (prompt, ctx) => {
				prompt.setPart(async () => {
					const { fsConfig } = await ctx.environment.config();
					return `Study vault name: ${JSON.stringify(vaultName)}\nWorking directory (vault root): ${fsConfig.cwd}\nRelative source paths resolve from this directory. read_file supports Obsidian wikilinks such as [[System Call]]. Only reading and research tools are available.`;
				});
			});
		}),
		...createObsidianReferenceExtensions(),
		referenceReadExtension,
		filesystemBundle.extensions.glob,
		filesystemBundle.extensions.grep,
		webSearchProviders.of(createExaWebSearchProvider()),
		webSearchProviders.of(createDuckDuckGoWebSearchProvider()),
		createWebExtension({}).extension,
	];
}
