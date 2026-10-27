import {
	documentDownloadPolicy,
	type FranklinExtension,
} from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';
import type { ModelSelection } from '../controller/types.js';
import type { InboxRunnerOptions } from './types.js';
import type { ResearchRecorder } from '../capture/evidence/recorder.js';

type Request = {
	selection: ModelSelection;
	signal: AbortSignal;
	timeout: number;
	prompt: string;
	extensions: (signal: AbortSignal) => readonly FranklinExtension[];
	evidence?: ResearchRecorder;
};

export async function runInboxRuntime(
	{ createAgent, auth, config }: InboxRunnerOptions,
	request: Request,
): Promise<void> {
	const question = request.selection;
	request.signal.throwIfAborted();
	// Completion tools capture this signal during construction. Forward the
	// deadline resolved from the new runtime into the same captured signal.
	const deadlineController = new AbortController();
	const signal = AbortSignal.any([request.signal, deadlineController.signal]);
	// The app factory gives each attempt its own environment and in-memory stores,
	// outside the persisted chat collection. Only the evidence observer saves research.
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
		// A question's former two-minute ceiling could cancel a healthy download
		// before its configured limit. Allow one full download plus two minutes
		// of reasoning; retain the longer existing allowance for action runs.
		const { totalTimeoutMs } = runtime.getConfig(documentDownloadPolicy);
		const timeout = Math.min(
			2_147_483_647,
			Math.max(request.timeout, totalTimeoutMs + 120_000),
		);
		deadline = AbortSignal.timeout(timeout);
		deadline.addEventListener('abort', expire, { once: true });
		signal.addEventListener('abort', cancel, { once: true });
		signal.throwIfAborted();
		const apiKey = await auth.getApiKey(question.provider);
		signal.throwIfAborted();
		if (!apiKey)
			throw new Error(
				`Sign in or add a key for ${question.provider} in Franklin settings, then retry.`,
			);
		request.evidence?.setSecret(apiKey);
		await request.evidence?.save();
		signal.throwIfAborted();
		for await (const event of runtime.prompt({
			role: 'user',
			content: [{ type: 'text', text: request.prompt }],
		})) {
			signal.throwIfAborted();
			if (event.type === 'turnStart' && request.evidence) {
				const { core } = await runtime.inspect();
				request.evidence.setSystemPrompt(core.systemPrompt);
			}
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
