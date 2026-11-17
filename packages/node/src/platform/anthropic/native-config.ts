import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';

export function nativeConfig(
	config: SandboxRuntimeConfig,
): SandboxRuntimeConfig {
	// Franklin rules (including '*') are evaluated by the shared policy callback.
	// Native lists would bypass that callback and use different matching semantics.
	return {
		...config,
		network: { ...config.network, allowedDomains: [], deniedDomains: [] },
	};
}
