// @vitest-environment jsdom

import { filesystemExtension, type ToolUseBlock } from '@franklin/extensions';
import { resolveToolRenderer } from '@franklin/react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { obsidianToolRegistry } from '../tool-registry.js';

afterEach(cleanup);

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
	const entry = resolveToolRenderer(obsidianToolRegistry, name);
	render(
		entry.summary({
			block: createBlock(name, args),
			status: 'success',
			args,
		}),
	);
}

describe('obsidianToolRegistry', () => {
	it('uses the later Obsidian file renderer override for wikilink paths', () => {
		renderSummary(filesystemExtension.tools.readFile.name, {
			path: '[[MEMORY]]',
		});

		expect(screen.getByText('Read')).toBeTruthy();
		expect(screen.getByText('MEMORY')).toBeTruthy();
		expect(screen.queryByText('[[MEMORY]]')).toBeNull();
	});

	it('preserves the default fallback for unrelated tools', () => {
		const name = 'unknown_tool';
		renderSummary(name, {});

		expect(screen.getByText(name)).toBeTruthy();
	});
});
