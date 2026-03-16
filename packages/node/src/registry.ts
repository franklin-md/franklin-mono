import type { AgentSpec } from '@franklin/agent';

import { commonAgentSpecs } from './agents/index.js';

/**
 * Maps agent names to specs.
 * Use `register()` to add agents, `get()` to resolve by name.
 */
export class AgentRegistry {
	private readonly specs = new Map<string, AgentSpec>();

	register(name: string, spec: AgentSpec): void {
		this.specs.set(name, spec);
	}

	get(name: string): AgentSpec {
		const spec = this.specs.get(name);
		if (!spec) throw new Error(`Unknown agent: "${name}"`);
		return spec;
	}

	has(name: string): boolean {
		return this.specs.has(name);
	}
}

/** Registry pre-loaded with known ACP agents. */
export function createDefaultRegistry(): AgentRegistry {
	const registry = new AgentRegistry();
	for (const [name, spec] of Object.entries(commonAgentSpecs)) {
		registry.register(name, spec);
	}
	return registry;
}
