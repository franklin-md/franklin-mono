import { describe, expect, it } from 'vitest';

import { claudeAgentSpec, codexAgentSpec } from '../agents/index.js';
import { AgentRegistry, createDefaultRegistry } from '../registry.js';

describe('AgentRegistry', () => {
	it('register and get', () => {
		const registry = new AgentRegistry();
		registry.register('test', { command: 'test-agent', args: ['--acp'] });

		const spec = registry.get('test');
		expect(spec.command).toBe('test-agent');
		expect(spec.args).toEqual(['--acp']);
	});

	it('has() returns true for registered agents', () => {
		const registry = new AgentRegistry();
		registry.register('a', { command: 'a' });

		expect(registry.has('a')).toBe(true);
		expect(registry.has('b')).toBe(false);
	});

	it('get() throws for unknown agent', () => {
		const registry = new AgentRegistry();

		expect(() => registry.get('nope')).toThrow('Unknown agent: "nope"');
	});

	it('register overwrites existing entry', () => {
		const registry = new AgentRegistry();
		registry.register('x', { command: 'old' });
		registry.register('x', { command: 'new' });

		expect(registry.get('x').command).toBe('new');
	});
});

describe('createDefaultRegistry', () => {
	it('has claude-acp registered', () => {
		const registry = createDefaultRegistry();

		expect(registry.has('claude-acp')).toBe(true);
		expect(registry.get('claude-acp')).toEqual(claudeAgentSpec);
	});

	it('has codex registered', () => {
		const registry = createDefaultRegistry();

		expect(registry.has('codex')).toBe(true);
		expect(registry.get('codex')).toEqual(codexAgentSpec);
	});
});
