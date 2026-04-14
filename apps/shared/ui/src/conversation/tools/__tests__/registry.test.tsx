// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import {
	createWebFetchExtension,
	readExtension,
	type ToolUseBlock,
} from '@franklin/extensions';
import { resolveToolRenderer } from '@franklin/react';
import { describe, expect, it } from 'vitest';

import { defaultToolRegistry } from '../registry/index.js';

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
	};
}

describe('defaultToolRegistry', () => {
	it('renders file actions with shared summary layout', () => {
		const name = readExtension.tools.readFile.name;
		const args = { path: 'src/conversation/tool-use.tsx' };
		const entry = resolveToolRenderer(defaultToolRegistry, name);

		render(
			entry.summary({
				block: createBlock(name, args),
				status: 'success',
				args,
			}),
		);

		expect(screen.getByText('Read')).toBeTruthy();
		expect(screen.getByText('tool-use.tsx')).toBeTruthy();
	});

	it('renders web tools with hostname and path details', () => {
		const name = createWebFetchExtension({}).tools.fetchUrl.name;
		const args = { url: 'https://example.com/docs/getting-started' };
		const entry = resolveToolRenderer(defaultToolRegistry, name);

		render(
			entry.summary({
				block: createBlock(name, args),
				status: 'success',
				args,
			}),
		);

		expect(screen.getByText('example.com')).toBeTruthy();
		expect(screen.getByText('/docs/getting-started')).toBeTruthy();
	});

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
