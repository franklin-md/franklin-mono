import { describe, expect, it } from 'vitest';

import type { FranklinAPI } from '@franklin/agent/browser';
import {
	filesystemExtension,
	type SystemPromptContent,
	type SystemPromptHandler,
} from '@franklin/extensions';
import { oxfordJoin } from '@franklin/lib';

import { obsidianSystemPromptExtension } from '../system-prompt.js';

const wikilinkPathToolNames = oxfordJoin(
	[
		filesystemExtension.tools.readFile.name,
		filesystemExtension.tools.writeFile.name,
		filesystemExtension.tools.editFile.name,
	].map((name) => `\`${name}\``),
);

async function renderSystemPrompt(): Promise<string> {
	const handlers: SystemPromptHandler[] = [];
	const api = {
		on(event: string, handler: SystemPromptHandler) {
			if (event === 'systemPrompt') handlers.push(handler);
		},
	} as unknown as FranklinAPI;

	obsidianSystemPromptExtension(api);

	const parts: string[] = [];
	for (const handler of handlers) {
		let content: SystemPromptContent | undefined;
		await handler({
			setPart(part) {
				content = part;
			},
		});

		if (content === undefined) continue;
		parts.push(typeof content === 'function' ? await content() : content);
	}

	return parts.join('\n\n');
}

describe('obsidianSystemPromptExtension', () => {
	it('tells agents that filesystem tool paths can be Obsidian wikilinks', async () => {
		const prompt = await renderSystemPrompt();

		expect(prompt).toContain(
			'pass a full Obsidian wikilink directly as the `path` value',
		);
		expect(prompt).toContain(
			`Tools such as ${wikilinkPathToolNames} resolve wikilink paths`,
		);
		expect(prompt).toContain('`[[Note#Heading|label]]`');
		expect(prompt).toContain('ambiguous');
	});
});
