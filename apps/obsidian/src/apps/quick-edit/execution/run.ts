import type { FranklinApp } from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';
import { joinAbsolute, toAbsolutePath } from '@franklin/lib';
import type { App } from 'obsidian';
import { getVaultAbsolutePath } from '../../../shared/obsidian/path.js';
import { createDefaultObsidianFilesystemPermissions } from '../../../shared/obsidian/filesystem/permissions.js';
import type { QuickEditRunner } from '../types.js';
import { quickEditExtensions } from './extensions.js';
import { quickEditPrompt } from './prompt.js';

export function createQuickEditRunner(
	app: App,
	franklin: FranklinApp,
): QuickEditRunner {
	return async (request) => {
		request.signal.throwIfAborted();
		const root = toAbsolutePath(getVaultAbsolutePath(app.vault));
		const permissions = createDefaultObsidianFilesystemPermissions(
			root,
			app.vault.configDir,
		);
		const { provider, model, reasoning } = request.settings;
		const key = await franklin.auth.getApiKey(provider);
		if (!key)
			throw new Error(
				`Sign in or add a key for ${provider} in Franklin settings → Connections, then retry.`,
			);
		request.signal.throwIfAborted();
		const completion: { value?: { success: boolean; summary: string } } = {};
		const runtime = await franklin.createAgent({
			extensions: quickEditExtensions((result) => {
				request.signal.throwIfAborted();
				if (completion.value) throw new Error('Quick edit already completed');
				completion.value = result;
			}),
			state: {
				core: { llmConfig: { provider, model, reasoning } },
				env: {
					fsConfig: {
						cwd: root,
						permissions: {
							...permissions,
							allowWrite: [joinAbsolute(root, request.state.path).slice(1)],
						},
					},
					netConfig: { allowedDomains: [], deniedDomains: [] },
				},
			},
		});
		const signal = AbortSignal.any([
			request.signal,
			AbortSignal.timeout(600_000),
		]);
		const cancel = () => {
			void runtime.cancel().catch(() => {});
		};
		signal.addEventListener('abort', cancel, { once: true });
		try {
			signal.throwIfAborted();
			for await (const event of runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: quickEditPrompt(request) }],
			})) {
				signal.throwIfAborted();
				if (event.type === 'turnEnd' && event.stopCode !== StopCode.Finished)
					throw new Error(event.stopMessage ?? 'Quick edit could not finish');
			}
			signal.throwIfAborted();
			if (!completion.value) throw new Error('The agent finished without reporting a verified edit result');
			if (!completion.value.success) throw new Error(completion.value.summary);
		} finally {
			signal.removeEventListener('abort', cancel);
			await runtime.dispose();
		}
	};
}
