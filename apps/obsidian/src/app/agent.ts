import type { FranklinApp, FranklinRuntime } from '@franklin/agent/browser';
import type { AbsolutePath } from '@franklin/lib';

export async function getDefaultAgent(
	app: FranklinApp,
	vaultRoot: AbsolutePath,
): Promise<FranklinRuntime> {
	// TODO: Recycle?
	const session = await app.agents.create({
		overrides: {
			core: { llmConfig: app.settings.get().defaultLLMConfig },
			env: {
				fsConfig: {
					cwd: vaultRoot,
					// TODO(FRA-188): Reintroduce Obsidian's default permission carve-outs
					// for `.obsidian/**` and outside-vault paths once the filesystem layer
					// can deny them instead of routing them to the host filesystem.
					permissions: { allowRead: ['**'], allowWrite: ['**'] },
				},
				netConfig: {
					allowedDomains: [],
					deniedDomains: [],
				},
			},
		},
	});

	return session.runtime;
}
