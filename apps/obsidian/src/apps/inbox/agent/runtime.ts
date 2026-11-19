import type { AgentTurnEnd, FranklinExtension } from '@franklin/agent';
import type { ModelSelection } from '../controller/types.js';
import type { InboxRunnerOptions } from './types.js';

type Request = {
	selection: ModelSelection;
	signal: AbortSignal;
	timeout: number;
	// Receives the runtime's inspect dump when the attempt settles.
	onTrace?: (trace: unknown) => void;
	prompt: string;
	extensions: (signal: AbortSignal) => readonly FranklinExtension[];
};

// Resolves with the turn end that settled the attempt; the agent reports
// credential failures there too. Cancellation and deadlines reject.
export async function runInboxRuntime(
	{ createAgent, config }: InboxRunnerOptions,
	request: Request,
): Promise<AgentTurnEnd> {
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
		let turnEnd: AgentTurnEnd | undefined;
		for await (const event of runtime.prompt({
			role: 'user',
			content: [{ type: 'text', text: request.prompt }],
		})) {
			signal.throwIfAborted();
			if (event.type === 'turnEnd') turnEnd = event;
		}
		signal.throwIfAborted();
		if (!turnEnd) throw new Error('The model stream ended without a turn end.');
		return turnEnd;
	} finally {
		deadline?.removeEventListener('abort', expire);
		signal.removeEventListener('abort', cancel);
		// The runtime holds the only transcript, so capture it before disposal.
		// A failed capture must not replace the attempt's own outcome.
		if (request.onTrace)
			await runtime
				.inspect()
				.then(request.onTrace)
				.catch(() => {});
		await runtime.dispose();
	}
}
