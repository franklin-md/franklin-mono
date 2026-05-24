// @vitest-environment jsdom

import { filesystemBundle, type ToolUseBlock } from '@franklin/agent';
import type { JsonObject } from '@franklin/lib';
import { resolveToolRenderer } from '@franklin/react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { obsidianToolRegistry } from '../tool-registry.js';

afterEach(cleanup);

function createBlock(name: string, args: JsonObject): ToolUseBlock {
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

function renderSummary(name: string, args: JsonObject) {
	const entry = resolveToolRenderer(obsidianToolRegistry, name);
	if (entry == null) {
		throw new Error(`Expected renderer for ${name}`);
	}
	return render(
		entry.summary({
			block: createBlock(name, args),
			status: 'success',
			args,
		}),
	);
}

describe('obsidianToolRegistry', () => {
	it('uses the later Obsidian file renderer override for wikilink paths', () => {
		renderSummary(filesystemBundle.tools.readFile.name, {
			path: '[[MEMORY]]',
		});

		expect(screen.getByText('Read')).toBeTruthy();
		expect(screen.getByText('MEMORY')).toBeTruthy();
		expect(screen.queryByText('[[MEMORY]]')).toBeNull();
	});

	it('overrides the shared fallback with a hidden renderer', () => {
		const name = 'unknown_tool';
		const { container } = renderSummary(name, {});

		expect(container.textContent).toBe('');
	});
});
