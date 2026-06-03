// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import {
	bashExtension,
	conversationTitleExtension,
	createWebExtension,
	DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID,
	EXA_WEB_SEARCH_PROVIDER_ID,
	filesystemBundle,
	spawnExtension,
	todoExtension,
	type ToolUseBlock,
} from '@franklin/agent';
import type { JsonObject, JsonValue } from '@franklin/lib';
import type { ToolStatus } from '@franklin/react';
import { resolveToolRenderer } from '@franklin/react';
import { describe, expect, it, vi } from 'vitest';

import {
	defaultToolRenderers,
	defaultToolRegistry,
} from '../../../src/conversation/tools/registry/index.js';

function createBlock(
	name: string,
	args: JsonObject,
	options?: {
		readonly endedAt?: number;
		readonly output?: JsonValue;
		readonly startedAt?: number;
	},
): ToolUseBlock {
	const block: ToolUseBlock = {
		kind: 'toolUse',
		call: {
			type: 'toolCall',
			id: 'call-1',
			name,
			arguments: args,
		},
		startedAt: options?.startedAt ?? 0,
		endedAt: options?.endedAt,
	};

	if (options?.output === undefined) {
		return block;
	}

	return { ...block, output: options.output };
}

function renderSummary(
	name: string,
	args: JsonObject,
	options?: {
		readonly endedAt?: number;
		readonly output?: JsonValue;
		readonly startedAt?: number;
		readonly status?: ToolStatus;
	},
) {
	const entry = resolveToolRenderer(defaultToolRegistry, name);
	if (entry == null) {
		throw new Error(`Expected renderer for ${name}`);
	}
	return render(
		entry.summary({
			block: createBlock(name, args, options),
			status: options?.status ?? 'success',
			args,
		}),
	);
}

describe('defaultToolRegistry', () => {
	describe('file tools', () => {
		it('renders read with file badge', () => {
			renderSummary(filesystemBundle.tools.readFile.name, {
				path: 'src/conversation/tool-use.tsx',
			});
			expect(screen.getByText('Read')).toBeTruthy();
			expect(screen.getByText('tool-use.tsx')).toBeTruthy();
		});

		it('renders write with file badge', () => {
			renderSummary(filesystemBundle.tools.writeFile.name, {
				path: 'src/new-file.ts',
				content: '',
			});
			expect(screen.getByText('Write')).toBeTruthy();
			expect(screen.getByText('new-file.ts')).toBeTruthy();
		});

		it('renders edit with file badge', () => {
			renderSummary(filesystemBundle.tools.editFile.name, {
				path: 'src/index.ts',
			});
			expect(screen.getByText('Edit')).toBeTruthy();
			expect(screen.getByText('index.ts')).toBeTruthy();
		});

		it('renders glob with pattern detail', () => {
			renderSummary(filesystemBundle.tools.glob.name, {
				pattern: '**/*.tsx',
			});
			expect(screen.getByText('Search files')).toBeTruthy();
			expect(screen.getByText('**/*.tsx')).toBeTruthy();
		});
	});

	describe('execution tools', () => {
		it('renders bash command', () => {
			renderSummary(bashExtension.tools.bash.name, {
				cmd: 'npm test',
			});
			expect(screen.getByText('Run')).toBeTruthy();
			expect(screen.getByText('$ npm test')).toBeTruthy();
		});
	});

	describe('agent tools', () => {
		it('renders spawn with a named child and running elapsed time', () => {
			vi.useFakeTimers();
			try {
				vi.setSystemTime(11_000);
				const view = renderSummary(
					spawnExtension.tools.spawn.name,
					{
						name: 'Summary writer',
						prompt: 'write the summary',
					},
					{
						startedAt: 4_000,
						status: 'in-progress',
					},
				);

				expect(screen.getByText('Agent')).toBeTruthy();
				expect(screen.queryByText('Spawn')).toBeNull();
				expect(screen.getByText('Summary writer')).toBeTruthy();
				expect(screen.getByText('7s')).toBeTruthy();

				view.unmount();
			} finally {
				vi.useRealTimers();
			}
		});

		it('renders spawn with a completed elapsed time', () => {
			renderSummary(
				spawnExtension.tools.spawn.name,
				{
					name: 'SpaceX Starship v3 Launch',
					prompt: 'Track the launch',
				},
				{
					startedAt: 1_000,
					endedAt: 25_000,
				},
			);

			expect(screen.getByText('Agent')).toBeTruthy();
			expect(screen.queryByText('Spawn')).toBeNull();
			expect(screen.getByText('SpaceX Starship v3 Launch')).toBeTruthy();
			expect(screen.getByText('24s')).toBeTruthy();
		});
	});

	describe('web tools', () => {
		it('renders with hostname and path', () => {
			const { container } = renderSummary(
				createWebExtension({}).tools.fetchUrl.name,
				{
					url: 'https://example.com/docs/getting-started',
				},
			);
			expect(container.textContent).toContain('Read');
			expect(container.textContent).toContain('example.com');
			expect(container.textContent).toContain('/docs/getting-started');
		});

		it('renders search before output resolves', () => {
			const { container } = renderSummary(
				createWebExtension({}).tools.searchWeb.name,
				{ query: 'example query' },
			);

			expect(container.textContent).toContain('Search');
			expect(container.textContent).toContain('example query');
			expect(container.querySelector('svg')).toBeTruthy();
		});

		it('renders search with query text from raw output', () => {
			const { container } = renderSummary(
				createWebExtension({}).tools.searchWeb.name,
				{ query: 'example query' },
				{
					output: {
						kind: 'success',
						provider: { id: EXA_WEB_SEARCH_PROVIDER_ID, name: 'Exa' },
						query: 'example query',
						results: [],
					},
				},
			);
			expect(container.textContent).toContain('Search');
			expect(container.textContent).toContain('example query');
		});

		it('renders search with query text from error output', () => {
			const { container } = renderSummary(
				createWebExtension({}).tools.searchWeb.name,
				{ query: 'example query' },
				{
					output: {
						kind: 'error',
						query: 'example query',
						message: 'No web search providers configured',
						failures: [],
					},
				},
			);
			expect(container.textContent).toContain('Search');
			expect(container.textContent).toContain('example query');
		});

		it('renders search with the Exa provider icon from raw output', () => {
			const { container } = renderSummary(
				createWebExtension({}).tools.searchWeb.name,
				{ query: 'example query' },
				{
					output: {
						kind: 'success',
						provider: { id: EXA_WEB_SEARCH_PROVIDER_ID, name: 'Exa' },
						query: 'example query',
						results: [],
					},
				},
			);

			const path = container.querySelector('path');

			expect(path?.getAttribute('fill')).toBe('#1F40ED');
		});

		it('renders search with the DuckDuckGo provider icon from raw output', () => {
			const { container } = renderSummary(
				createWebExtension({}).tools.searchWeb.name,
				{ query: 'example query' },
				{
					output: {
						kind: 'success',
						provider: {
							id: DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID,
							name: 'DuckDuckGo',
						},
						query: 'example query',
						results: [],
					},
				},
			);

			const path = container.querySelector('path');

			expect(path?.getAttribute('fill')).toBe('#DE5833');
		});
	});

	describe('todo tools', () => {
		it('renders add todo with text', () => {
			renderSummary(todoExtension.tools.addTodo.name, {
				text: 'Fix the bug',
			});
			expect(screen.getByText('Add todo')).toBeTruthy();
			expect(screen.getByText('Fix the bug')).toBeTruthy();
		});

		it('renders complete todo', () => {
			renderSummary(todoExtension.tools.completeTodo.name, {
				id: '1',
			});
			expect(screen.getByText('Complete todo')).toBeTruthy();
		});

		it('renders list todos', () => {
			renderSummary(todoExtension.tools.listTodos.name, {});
			expect(screen.getByText('List todos')).toBeTruthy();
		});
	});

	describe('conversation title tools', () => {
		it('uses the shared fallback for set chat title without a dedicated renderer', () => {
			const name = conversationTitleExtension.tools.setChatTitle.name;
			const directEntry = defaultToolRenderers.find(
				([toolName]) => toolName === name,
			);

			expect(directEntry).toBeUndefined();

			renderSummary(name, { title: 'Inbox triage' });
			expect(screen.getByText(name)).toBeTruthy();
		});
	});

	describe('unknown tools', () => {
		it('falls back to the tool name for unknown tools', () => {
			const name = 'unknown_tool';

			renderSummary(name, {});
			expect(screen.getByText(name)).toBeTruthy();
		});
	});
});
