import { describe, expect, it } from 'vitest';
import {
	createFranklinAgents,
	filesystemBundle,
	tableExtension,
	type AuthManager,
} from '@franklin/agent';
import { createMemoryEnvironment } from '@franklin/agent/testing';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	toAbsolutePath,
	type JsonObject,
} from '@franklin/lib';
import {
	createMockMiniACP,
	derive,
	toolCalls,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { MCPConnections } from '../host.js';
import { mcpToolName } from '../names.js';
import { createMCPFixture } from '../testing/fixture.js';

const config = {
	fsConfig: {
		cwd: toAbsolutePath('/vault'),
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};
const auth = {
	getApiKey: async () => undefined,
	entries: () => ({}),
	onAuthChange: () => () => {},
} as unknown as AuthManager;

describe('research to vault artifact', () => {
	it('uses credentialed research results to write matching Markdown and CSV through the normal agent tools', async () => {
		const fixture = createMCPFixture();
		const connections = new MCPConnections(fixture.options);
		let table: JsonObject = {};
		const mock = createMockMiniACP({
			turns: [
				turn([
					toolCalls([
						{
							name: mcpToolName(fixture.server.id, 'web_search_exa'),
							arguments: { query: 'companies' },
						},
					]),
					derive(({ toolResults }) => {
						const block = toolResults
							.at(-1)!
							.content.find(
								(part) => part.type === 'text' && part.text.includes('"rows"'),
							);
						if (!block || block.type !== 'text')
							throw new Error('No research rows');
						const result = JSON.parse(block.text) as {
							rows: Array<{ name: string; url: string }>;
						};
						table = {
							columns: [{ key: 'name', label: 'Company', type: 'text' }],
							rows: result.rows.map((row) => ({
								cells: [row.name],
								sourceUrls: [row.url],
							})),
						};
						return [
							toolCalls([
								{
									name: 'write_table',
									arguments: {
										...table,
										format: 'markdown',
										path: 'companies.md',
									},
								},
							]),
						];
					}),
					derive(({ toolResults }) => {
						const block = toolResults.at(-1)!.content[0]!;
						if (block.type !== 'text') throw new Error('No receipt');
						const receipt = JSON.parse(block.text) as { datasetHash: string };
						return [
							toolCalls([
								{
									name: 'write_table',
									arguments: {
										...table,
										format: 'csv',
										path: 'companies.csv',
										expectedDatasetHash: receipt.datasetHash,
									},
								},
							]),
						];
					}),
					turnEnd(),
				]),
			],
		});
		const filesystem = new MemoryFilesystem();
		const agents = createFranklinAgents({
			connect: mock.connector,
			auth,
			environment: (cfg) => createMemoryEnvironment(filesystem, cfg),
			extensions: [
				filesystemBundle.extensions.editFile,
				tableExtension(),
				connections.extension(),
			],
		});
		const { runtime } = await agents.create({ state: { env: config } });
		try {
			for await (const _event of runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'Research and export companies' }],
			})) {
				/* drain */
			}
			expect(mock.calls().toolResults.every((result) => !result.isError)).toBe(
				true,
			);
			const markdown = new TextDecoder().decode(
				await filesystem.readFile(toAbsolutePath('/vault/companies.md')),
			);
			const csv = new TextDecoder().decode(
				await filesystem.readFile(toAbsolutePath('/vault/companies.csv')),
			);
			expect(markdown).toContain('| Example | [1](<https://example.com>) |');
			expect(csv).toContain('Example,https://example.com');
			expect(
				markdown + csv + JSON.stringify(runtime.getSession()),
			).not.toContain('secret-exa-key');
		} finally {
			await runtime.dispose();
			await connections.dispose();
		}
	});
	it('rejects a denied destination and an existing note without overwriting it', async () => {
		const filesystem = new MemoryFilesystem();
		await filesystem.writeFile(
			toAbsolutePath('/vault/existing.md'),
			'user text',
		);
		const args = {
			columns: [{ key: 'n', label: 'Name', type: 'text' }],
			rows: [{ cells: ['Example'], sourceUrls: [] }],
			format: 'markdown',
		};
		const mock = createMockMiniACP({
			turns: [
				turn([
					toolCalls([
						{
							name: 'write_table',
							arguments: { ...args, path: 'existing.md' },
						},
						{ name: 'write_table', arguments: { ...args, path: 'denied.md' } },
					]),
					turnEnd(),
				]),
			],
		});
		const agents = createFranklinAgents({
			connect: mock.connector,
			auth,
			environment: (cfg) => createMemoryEnvironment(filesystem, cfg),
			extensions: [filesystemBundle.extensions.editFile, tableExtension()],
		});
		const { runtime } = await agents.create({
			state: {
				env: {
					...config,
					fsConfig: {
						...config.fsConfig,
						permissions: {
							...FILESYSTEM_ALLOW_ALL,
							denyWrite: ['/vault/denied.md'],
						},
					},
				},
			},
		});
		try {
			for await (const _event of runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'export' }],
			})) {
				/* drain */
			}
			expect(mock.calls().toolResults.every((result) => result.isError)).toBe(
				true,
			);
			expect(
				new TextDecoder().decode(
					await filesystem.readFile(toAbsolutePath('/vault/existing.md')),
				),
			).toBe('user text');
			expect(await filesystem.exists(toAbsolutePath('/vault/denied.md'))).toBe(
				false,
			);
		} finally {
			await runtime.dispose();
		}
	});
});
