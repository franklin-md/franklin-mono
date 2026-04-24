import { describe, expect, it } from 'vitest';

import type { FranklinApp } from '@franklin/agent/browser';
import { toAbsolutePath } from '@franklin/lib';

import { createObsidianAgentInput } from '../agent.js';
import { createDefaultObsidianFilesystemPermissions } from '../../platform/filesystem/permissions.js';

describe('createObsidianAgentInput', () => {
	it('returns the Obsidian default session overrides', () => {
		const defaultLLMConfig = {
			provider: 'openai-codex',
			model: 'gpt-5.4',
			reasoning: 'medium' as const,
		};
		const app = {
			settings: {
				get: () => ({
					defaultLLMConfig,
				}),
			},
		} as unknown as FranklinApp;
		const vaultRoot = toAbsolutePath('/vault');
		const configDir = '.obsidian';

		expect(createObsidianAgentInput(app, vaultRoot, configDir)).toEqual({
			overrides: {
				core: { llmConfig: defaultLLMConfig },
				env: {
					fsConfig: {
						cwd: vaultRoot,
						permissions: createDefaultObsidianFilesystemPermissions(
							vaultRoot,
							configDir,
						),
					},
					netConfig: {
						allowedDomains: [],
						deniedDomains: [],
					},
				},
			},
		});
	});
});
