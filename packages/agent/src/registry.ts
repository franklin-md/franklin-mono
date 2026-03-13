import type { StdioTransportOptions } from './transport.js';

/** Transport spec for an agent. */
export type AgentSpec = StdioTransportOptions;

/**
 * Maps agent names to transport specs.
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
	registry.register('codex', { command: 'codex', args: ['--acp'] });
	return registry;
}
