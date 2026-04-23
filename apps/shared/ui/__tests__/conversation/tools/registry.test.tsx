// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import {
	bashExtension,
	createWebExtension,
	filesystemExtension,
	todoExtension,
	type ToolUseBlock,
} from '@franklin/extensions';
import { resolveToolRenderer } from '@franklin/react';
import { describe, expect, it } from 'vitest';

import { defaultToolRegistry } from '../../../src/conversation/tools/registry/index.js';

function createBlock(
	name: string,
	args: Record<string, unknown>,
): ToolUseBlock {
	return {
		kind: 'toolUse',
		call: {
			type: 'toolCall',
			id: 'call-1',
			name,
			arguments: args,
		},
		startedAt: 0,
	};
}

function renderSummary(name: string, args: Record<string, unknown>) {
	const entry = resolveToolRenderer(defaultToolRegistry, name);
	render(
		entry.summary({
			block: createBlock(name, args),
			status: 'success',
			args,
		}),
	);
}

describe('defaultToolRegistry', () => {
	describe('file tools', () => {
		it('renders read with file badge', () => {
			renderSummary(filesystemExtension.tools.readFile.name, {
				path: 'src/conversation/tool-use.tsx',
			});
			expect(screen.getByText('Read')).toBeTruthy();
			expect(screen.getByText('tool-use.tsx')).toBeTruthy();
		});

		it('renders write with file badge', () => {
			renderSummary(filesystemExtension.tools.writeFile.name, {
				path: 'src/new-file.ts',
				content: '',
			});
			expect(screen.getByText('Write')).toBeTruthy();
			expect(screen.getByText('new-file.ts')).toBeTruthy();
		});

		it('renders edit with file badge', () => {
			renderSummary(filesystemExtension.tools.editFile.name, {
				path: 'src/index.ts',
			});
			expect(screen.getByText('Edit')).toBeTruthy();
			expect(screen.getByText('index.ts')).toBeTruthy();
		});

		it('renders glob with pattern detail', () => {
			renderSummary(filesystemExtension.tools.glob.name, {
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
			expect(screen.getByText('$ npm test')).toBeTruthy();
		});
	});

	describe('web tools', () => {
		it('renders with hostname and path', () => {
			renderSummary(createWebExtension({}).tools.fetchUrl.name, {
				url: 'https://example.com/docs/getting-started',
			});
			expect(screen.getByText('example.com')).toBeTruthy();
			expect(screen.getByText('/docs/getting-started')).toBeTruthy();
		});

		it('renders search with query text', () => {
			renderSummary(createWebExtension({}).tools.searchWeb.name, {
				query: 'example query',
			});
			expect(screen.getByText('Search')).toBeTruthy();
			expect(screen.getByText('example query')).toBeTruthy();
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

	describe('fallback', () => {
		it('falls back to the tool name for unknown tools', () => {
			const name = 'unknown_tool';
			const entry = resolveToolRenderer(defaultToolRegistry, name);

			render(
				entry.summary({
					block: createBlock(name, {}),
					status: 'in-progress',
					args: {},
				}),
			);

			expect(screen.getByText(name)).toBeTruthy();
		});
	});
});
