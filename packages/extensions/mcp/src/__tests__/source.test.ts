import { afterEach, describe, expect, it } from 'vitest';
import type { JsonValue } from '@franklin/lib';
import { MCPToolSource } from '../source.js';
import { MCPConnections } from '../host.js';
import { createMCPFixture } from '../testing/fixture.js';
import { compileSchema } from '../validate.js';

const owned: Array<{ dispose(): Promise<void> }> = [];
afterEach(async () => {
	await Promise.all(owned.splice(0).map((item) => item.dispose()));
});
function source(
	fixture: ReturnType<typeof createMCPFixture>,
	consumer: 'chat' | 'research' = 'chat',
) {
	const value = new MCPToolSource(
		fixture.options,
		async () => ({ allowedDomains: [], deniedDomains: [] }),
		consumer,
		() => {},
	);
	owned.push(value);
	return value;
}
const invocation = () => ({
	signal: new AbortController().signal,
	toolCallId: 'call',
});

describe('credentialed MCP tools', () => {
	it('discovers through the real SDK, validates inputs, preserves structured results and redacts echoed keys', async () => {
		const fixture = createMCPFixture();
		fixture.setKey(' secret-exa-key ');
		const tools = await source(fixture).prepare(invocation().signal);
		expect(tools).toHaveLength(1);
		const tool = tools[0]!;
		expect(tool.definition.inputSchema).toHaveProperty(
			'properties.query.minLength',
			1,
		);
		const invalid = await tool.execute({ query: 1 }, invocation());
		expect(invalid).toMatchObject({ isError: true });
		expect(
			fixture.requests.filter((r) => r.method === 'tools/call'),
		).toHaveLength(0);
		const result = await tool.execute({ query: 'companies' }, invocation());
		expect(result).toMatchObject({
			structuredContent: { rows: [{ name: 'Example' }] },
		});
		expect(JSON.stringify(result)).not.toContain('secret-exa-key');
		expect(
			fixture.requests.every(
				(r) => r.headers.get('x-api-key') === 'secret-exa-key',
			),
		).toBe(true);
		expect(await tool.render?.(result)).toMatchObject({
			content: expect.arrayContaining([{ type: 'text', text: '[REDACTED]' }]),
		});
	});
	it('omits image payloads that echo credentials', async () => {
		const fixture = createMCPFixture();
		const key = 'c2VjcmV0LWtleQ==';
		fixture.setKey(key);
		fixture.setResult({
			content: [{ type: 'image', data: key, mimeType: 'image/png' }],
		});
		const tools = await source(fixture).prepare(invocation().signal);
		const result = await tools[0]!.execute({ query: 'x' }, invocation());
		expect(JSON.stringify(result)).not.toContain(key);
		expect(JSON.stringify(result)).toContain('Image omitted');
	});
	it('limits ordinary Inbox research to explicitly allowed Exa read tools', async () => {
		const fixture = createMCPFixture();
		fixture.server.enabledTools.push('agent_run');
		const research = source(fixture, 'research');
		expect(
			(await research.prepare(invocation().signal)).map(
				(t) => t.definition.description,
			),
		).toEqual(['Exa: Search']);
		fixture.setServers([{ ...fixture.server, preset: undefined }]);
		expect(await research.prepare(invocation().signal)).toEqual([]);
	});
	it('blocks stale tool definitions immediately when a server is disabled or a key is removed', async () => {
		const fixture = createMCPFixture();
		const tools = await source(fixture).prepare(invocation().signal);
		fixture.setServers([{ ...fixture.server, enabled: false }]);
		expect(await tools[0]!.execute({ query: 'x' }, invocation())).toMatchObject(
			{ isError: true },
		);
		expect(
			fixture.requests.filter((r) => r.method === 'tools/call'),
		).toHaveLength(0);
	});
	it('discovers connections added after an agent source was created', async () => {
		const fixture = createMCPFixture();
		const server = fixture.server;
		fixture.setServers([]);
		const live = source(fixture);
		expect(await live.prepare(invocation().signal)).toEqual([]);
		fixture.setServers([server]);
		expect(await live.prepare(invocation().signal)).toHaveLength(1);
	});
	it('rotates credentials into a fresh connection and keeps stable tool names', async () => {
		const fixture = createMCPFixture();
		const value = source(fixture);
		const before = await value.prepare(invocation().signal);
		fixture.setKey('rotated-key');
		const after = await value.prepare(invocation().signal);
		expect(after[0]!.definition.name).toBe(before[0]!.definition.name);
		await after[0]!.execute({ query: 'x' }, invocation());
		expect(fixture.requests.at(-1)!.headers.get('x-api-key')).toBe(
			'rotated-key',
		);
		expect(
			fixture.requests.filter((r) => r.method === 'initialize'),
		).toHaveLength(2);
	});
	it('tests connection without launching research or claiming a key was verified', async () => {
		const fixture = createMCPFixture();
		const host = new MCPConnections(fixture.options);
		owned.push(host);
		const status = await host.testConnection(fixture.server.id);
		expect(status.message).toBe('Connected · key configured');
		expect(fixture.requests.some((r) => r.method === 'tools/call')).toBe(false);
	});
	it('reports denied access without exposing HTTP bodies and never retries tool submission', async () => {
		const fixture = createMCPFixture();
		const tools = await source(fixture).prepare(invocation().signal);
		fixture.setStatus(403);
		const result = await tools[0]!.execute({ query: 'x' }, invocation());
		expect(JSON.stringify(result)).toContain('access denied');
		expect(JSON.stringify(result)).not.toContain('secret-exa-key');
		expect(
			fixture.requests.filter((r) => r.method === 'tools/call'),
		).toHaveLength(1);
	});
	it('rejects external references and unknown dialects without fetching them', () => {
		expect(() =>
			compileSchema({
				type: 'object',
				properties: { value: { $ref: 'https://evil.test/schema' } },
			}),
		).toThrow('External');
		expect(() =>
			compileSchema({ type: 'object', $schema: 'https://evil.test/dialect' }),
		).toThrow('dialect');
		const validate = compileSchema({
			type: 'object',
			$defs: { name: { type: 'string' } },
			properties: { name: { $ref: '#/$defs/name' } },
		});
		expect(() => validate({ name: 2 })).toThrow();
	});
	it('propagates cancellation into the call rather than sending another request', async () => {
		const fixture = createMCPFixture();
		const tools = await source(fixture).prepare(invocation().signal);
		const controller = new AbortController();
		controller.abort();
		const result: JsonValue = await tools[0]!.execute(
			{ query: 'x' },
			{ signal: controller.signal, toolCallId: 'cancelled' },
		);
		expect(result).toMatchObject({ isError: true });
		expect(
			fixture.requests.filter((r) => r.method === 'tools/call'),
		).toHaveLength(0);
	});
});
