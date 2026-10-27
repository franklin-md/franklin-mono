import {
	buildStateExtensionModule,
	createCoreStateModule,
	createEnvironmentModule,
	createReferencesModule,
	createStoreStateModule,
	StoreRegistry,
} from '@franklin/agent';
import { compile, reduceExtensions } from '@franklin/extensibility';
import {
	createConfigurationModule,
	createDependencyModule,
} from '@franklin/extensibility/module';
import { StopCode } from '@franklin/mini-acp';
import type { ModelSelection } from '../controller/types.js';
import type { InboxRunnerOptions } from './types.js';
import { inboxResearchExtension } from './research.js';
import type { ResearchRecorder } from '../capture/evidence/recorder.js';

type Request = {
	selection: ModelSelection;
	signal: AbortSignal;
	timeout: number;
	prompt: string;
	extension: (signal: AbortSignal) => ReturnType<typeof inboxResearchExtension>;
	writable?: boolean;
	evidence?: ResearchRecorder;
};

export async function runInboxRuntime(
	{ connect, auth, environment, config, vaultName }: InboxRunnerOptions,
	request: Request,
): Promise<void> {
	// Each attempt owns an in-memory registry and environment; it never enters
	// the persisted chat/session collection. Only the dedicated evidence observer
	// retains research text; configuration and model reasoning are never recorded.
	const module = buildStateExtensionModule([
		createCoreStateModule(connect),
		createEnvironmentModule(environment),
		createStoreStateModule(new StoreRegistry()),
		createReferencesModule(),
		createDependencyModule('auth', auth),
		createConfigurationModule(),
	]);
	const state = module.emptyState();
	state.env = structuredClone(config);
	const question = request.selection;
	const signal = AbortSignal.any([
		request.signal,
		AbortSignal.timeout(request.timeout),
	]);
	signal.throwIfAborted();
	state.core.llmConfig = {
		provider: question.provider,
		model: question.model,
		reasoning: question.reasoning,
	};
	const simple = module.instantiate(state);
	const runtime = await compile(
		simple.extensionPoint,
		simple.compiler,
		reduceExtensions(
			inboxResearchExtension({ vaultName, writable: request.writable }),
			request.extension(signal),
			...(request.evidence ? [request.evidence.extension] : []),
		),
	);
	const cancel = () => {
		void runtime.cancel().catch(() => {});
	};
	signal.addEventListener('abort', cancel, { once: true });
	try {
		signal.throwIfAborted();
		const apiKey = await auth.getApiKey(question.provider);
		signal.throwIfAborted();
		if (!apiKey)
			throw new Error(
				`Sign in or add a key for ${question.provider} in Franklin settings, then retry.`,
			);
		request.evidence?.setSecret(apiKey);
		await request.evidence?.save();
		await runtime.setLLMConfig({ apiKey });
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
		signal.removeEventListener('abort', cancel);
		await runtime.dispose();
	}
}
