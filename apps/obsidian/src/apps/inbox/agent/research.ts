import type { MCPConnections } from '@franklin/extension-mcp';
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
	writable?: boolean;
	connections?: MCPConnections;
};

export function createInboxResearchExtensions({
	vaultName,
	writable = false,
	connections,
}: Options): FranklinExtension[] {
	return [
		defineExtension<[CoreModule, EnvironmentModule, StoreModule]>((api) => {
			// Reference-backed reads record file hashes. Register their existing key
			// without adding edit_file just to obtain its initializer. The runner's
			// StoreRegistry has no persistence adapter: file hashes die with it.
			// The capture observer separately saves bounded tool-visible evidence.
			// See packages/agent/README.md and extensions/references/read.ts.
			if (!writable)
				api.registerStore(filesystemBundle.keys.file, {}, 'private');
			api.on('systemPrompt', (prompt, ctx) => {
				prompt.setPart(async () => {
					const { fsConfig } = await ctx.environment.config();
					return `Study vault name: ${JSON.stringify(vaultName)}\nWorking directory (vault root): ${fsConfig.cwd}\nRelative source paths resolve from this directory. read_file supports Obsidian wikilinks such as [[System Call]]. ${writable ? 'File editing and shell commands are available for this action.' : 'Only reading and research tools are available.'}`;
				});
			});
		}),
		...(connections
			? [connections.extension(writable ? 'chat' : 'research')]
			: []),
		...createObsidianReferenceExtensions(),
		referenceReadExtension,
		filesystemBundle.extensions.glob,
		filesystemBundle.extensions.grep,
		webSearchProviders.compute([], () =>
			connections?.hasExaPreset()
				? [createDuckDuckGoWebSearchProvider()]
				: [createExaWebSearchProvider(), createDuckDuckGoWebSearchProvider()],
		),
		createWebExtension({}).extension,
	];
}
