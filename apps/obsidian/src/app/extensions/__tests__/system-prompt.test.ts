import { describe, expect, it } from 'vitest';
import type { SetPartOptions, SystemPrompt } from '@franklin/extensions';

import {
	OBSIDIAN_HOST_SYSTEM_PROMPT,
	obsidianSystemPromptExtension,
} from '../system-prompt.js';

type SystemPromptTestHandler = (prompt: SystemPrompt) => void;

function collectHandlers(): SystemPromptTestHandler[] {
	const handlers: SystemPromptTestHandler[] = [];
	const api = {
		on(event: string, handler: SystemPromptTestHandler) {
			if (event === 'systemPrompt') handlers.push(handler);
		},
	} as Parameters<typeof obsidianSystemPromptExtension>[0];

	obsidianSystemPromptExtension(api);

	return handlers;
}

describe('obsidianSystemPromptExtension', () => {
	it('registers one Obsidian host system prompt fragment', () => {
		const handlers = collectHandlers();
		let fragment = '';
		let opts: SetPartOptions | undefined;

		handlers[0]?.({
			setPart(content, options) {
				if (typeof content !== 'string') {
					throw new Error('obsidian system prompt should be a string literal');
				}
				fragment = content;
				opts = options;
			},
		});

		expect(handlers).toHaveLength(1);
		expect(fragment).toBe(OBSIDIAN_HOST_SYSTEM_PROMPT);
		expect(fragment).toContain('Obsidian desktop app');
		expect(fragment).toContain('vault root');
		expect(fragment).toContain('.obsidian');
		expect(fragment).toContain('explicit user confirmation');
		expect(opts).toEqual({ once: true });
	});
});
