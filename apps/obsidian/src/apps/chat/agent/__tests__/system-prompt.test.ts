import { describe, expect, it } from 'vitest';

import type { FranklinAPI } from '@franklin/agent';
import {
	filesystemBundle,
	type SystemPromptContent,
	type SystemPromptHandler,
	type CoreSignature,
} from '@franklin/agent';
import {
	createApi,
	createExtensionPoint,
	createRegistry,
	createRegistryView,
	type BaseRuntime,
} from '@franklin/extensibility';
import { oxfordJoin } from '@franklin/lib';

import { obsidianSystemPromptExtension } from '../system-prompt.js';

const wikilinkPathToolNames = oxfordJoin(
	[
		filesystemBundle.tools.readFile.name,
		filesystemBundle.tools.writeFile.name,
		filesystemBundle.tools.editFile.name,
	].map((name) => `\`${name}\``),
);

const coreExtensionPoint = createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

async function renderSystemPrompt(): Promise<string> {
	const { registry, writer } = createRegistry<CoreSignature, BaseRuntime>();
	const api = createApi<CoreSignature, BaseRuntime>(coreExtensionPoint, writer);

	obsidianSystemPromptExtension(api as unknown as FranklinAPI);

	const handlers = createRegistryView(registry)
		.argsFor('on')
		.flatMap(([event, handler]) =>
			event === 'systemPrompt' ? [handler as SystemPromptHandler] : [],
		);

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
		expect(prompt).toContain(
			'To retrieve the contents of embedded wikilinks, pass the wikilink path directly to `read_file`',
		);
		expect(prompt).toContain('This works for embedded images too');
		expect(prompt).toContain('ambiguous');
	});

	it('requires explicit user permission before deleting files', async () => {
		const prompt = await renderSystemPrompt();

		expect(prompt).toContain('Never delete files or directories');
		expect(prompt).toContain('explicitly asked for that deletion');
		expect(prompt).toContain('`rm`');
		expect(prompt).toContain('ask the user first and wait for permission');
	});
});
