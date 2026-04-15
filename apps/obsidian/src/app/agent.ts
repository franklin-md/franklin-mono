import type { FranklinApp, FranklinRuntime } from '@franklin/agent/browser';
import { DEFAULT_NETWORK_CONFIG } from '@franklin/extensions';
import type { AbsolutePath } from '@franklin/lib';

export async function getDefaultAgent(
	app: FranklinApp,
	vaultRoot: AbsolutePath,
): Promise<FranklinRuntime> {
	const session =
		app.agents.list()[0] ??
		(await app.agents.create({
			overrides: {
				core: { llmConfig: app.settings.get().defaultLLMConfig },
				env: {
					fsConfig: {
						cwd: vaultRoot,
						permissions: { allowRead: ['**'], allowWrite: ['**'] },
					},
					netConfig: {
						allowedDomains: [...DEFAULT_NETWORK_CONFIG.allowedDomains],
						deniedDomains: [...DEFAULT_NETWORK_CONFIG.deniedDomains],
					},
				},
			},
		}));

	return session.runtime;
}
