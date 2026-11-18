import type { FranklinExtension } from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';
import type { ModelSelection } from '../controller/types.js';
import type { InboxRunnerOptions } from './types.js';

type Request = {
	selection: ModelSelection;
	signal: AbortSignal;
	timeout: number;
	prompt: string;
	extensions: (signal: AbortSignal) => readonly FranklinExtension[];
};

export async function runInboxRuntime(
	{ createAgent, auth, config }: InboxRunnerOptions,
	request: Request,
): Promise<void> {
	const question = request.selection;
	request.signal.throwIfAborted();
	// Completion tools capture this signal during construction. Forward the
	// attempt deadline into the same captured signal.
	const deadlineController = new AbortController();
	const signal = AbortSignal.any([request.signal, deadlineController.signal]);
	// The app factory gives each attempt its own environment and in-memory stores,
	// outside the persisted chat collection. Attempts never save sessions or stores.
	const runtime = await createAgent({
		state: {
			env: structuredClone(config),
			core: {
				llmConfig: {
					provider: question.provider,
					model: question.model,
					reasoning: question.reasoning,
				},
			},
		},
		extensions: request.extensions(signal),
	});
	let deadline: AbortSignal | undefined;
	const expire = () => deadlineController.abort(deadline?.reason);
	const cancel = () => {
		void runtime.cancel().catch(() => {});
	};
	try {
		deadline = AbortSignal.timeout(request.timeout);
		deadline.addEventListener('abort', expire, { once: true });
		signal.addEventListener('abort', cancel, { once: true });
		signal.throwIfAborted();
		const apiKey = await auth.getApiKey(question.provider);
		signal.throwIfAborted();
		if (!apiKey)
			throw new Error(
				`Sign in or add a key for ${question.provider} in Franklin settings, then retry.`,
			);
		for await (const event of runtime.prompt({
			role: 'user',
			content: [{ type: 'text', text: request.prompt }],
		})) {
			signal.throwIfAborted();
			if (event.type === 'turnEnd' && event.stopCode !== StopCode.Finished)
				throw new Error(
					event.stopMessage ??
						`Model request failed (${event.stopCode}). Check model access and credentials, then retry.`,
				);
		}
		signal.throwIfAborted();
	} finally {
		deadline?.removeEventListener('abort', expire);
		signal.removeEventListener('abort', cancel);
		await runtime.dispose();
	}
}
