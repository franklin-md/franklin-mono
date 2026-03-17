import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRelayConfig } from '../relay-config.js';

describe('createRelayConfig', () => {
	const tools = [
		{
			name: 'greet',
			description: 'Say hello',
			inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
		},
	];

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('produces ACP-compliant McpServerStdio shape', () => {
		const config = createRelayConfig({
			callbackUrl: 'http://localhost:3000',
			tools,
		});

		// Required fields per ACP McpServerStdio schema
		expect(config).toHaveProperty('name');
		expect(typeof config.name).toBe('string');
		expect(config.name.length).toBeGreaterThan(0);

		expect(config).toHaveProperty('command');
		expect(typeof config.command).toBe('string');

		expect(config).toHaveProperty('args');
		expect(Array.isArray(config.args)).toBe(true);

		expect(config).toHaveProperty('env');
		expect(Array.isArray(config.env)).toBe(true);
	});

	it('env is Array<{name, value}> not Record<string, string>', () => {
		const config = createRelayConfig({
			callbackUrl: 'http://localhost:3000',
			tools,
		});

		// Each env entry must have name and value strings
		for (const entry of config.env) {
			expect(entry).toHaveProperty('name');
			expect(entry).toHaveProperty('value');
			expect(typeof entry.name).toBe('string');
			expect(typeof entry.value).toBe('string');
		}
	});

	it('passes callback URL and tools through env', () => {
		const config = createRelayConfig({
			callbackUrl: 'http://localhost:3000',
			tools,
		});

		const envMap = new Map(config.env.map((e) => [e.name, e.value]));
		expect(envMap.get('FRANKLIN_CALLBACK_URL')).toBe('http://localhost:3000');
		expect(JSON.parse(envMap.get('FRANKLIN_TOOLS')!)).toEqual(tools);
	});

	it('adds ELECTRON_RUN_AS_NODE when inside Electron', () => {
		vi.stubGlobal('process', {
			...process,
			versions: { ...process.versions, electron: '33.0.0' },
		});

		const config = createRelayConfig({
			callbackUrl: 'http://localhost:3000',
			tools,
		});

		const envMap = new Map(config.env.map((e) => [e.name, e.value]));
		expect(envMap.get('ELECTRON_RUN_AS_NODE')).toBe('1');
	});

	it('does not add ELECTRON_RUN_AS_NODE outside Electron', () => {
		const config = createRelayConfig({
			callbackUrl: 'http://localhost:3000',
			tools,
		});

		const envMap = new Map(config.env.map((e) => [e.name, e.value]));
		expect(envMap.has('ELECTRON_RUN_AS_NODE')).toBe(false);
	});
});
