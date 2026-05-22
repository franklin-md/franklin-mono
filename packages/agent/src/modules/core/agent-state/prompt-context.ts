import type {
	Context,
	ContextPatch,
	LLMConfig,
	Message,
	MiniACPClient,
	ToolDefinition,
} from '@franklin/mini-acp';
import type { ContextTracker } from '@franklin/mini-acp/session';
import { copyContext, copyContextPatch } from './context-copy.js';
import type { PromptContextSync, SystemPromptBuilder } from './types.js';

type CreatePromptContextSyncInput = {
	readonly confirmed: ContextTracker;
	readonly desired: ContextTracker;
	readonly systemPrompt: SystemPromptBuilder;
	readonly tools: readonly ToolDefinition[];
};

export function createPromptContextSync({
	confirmed,
	desired,
	systemPrompt,
	tools,
}: CreatePromptContextSyncInput): PromptContextSync {
	let hasSentContext = false;

	async function desiredContext(): Promise<Context> {
		const base = desired.get();
		const builtSystemPrompt = await systemPrompt.build();
		return {
			systemPrompt: builtSystemPrompt.changed
				? builtSystemPrompt.systemPrompt
				: base.systemPrompt,
			messages: [...base.messages],
			tools: [...tools],
			config: { ...base.config },
		};
	}

	return {
		async sync(client: Pick<MiniACPClient, 'setContext'>): Promise<void> {
			const next = await desiredContext();
			const patch = hasSentContext
				? diffContext(confirmed.get(), next)
				: fullContextPatch(next);
			if (isEmptyPatch(patch)) return;

			await client.setContext(copyContextPatch(patch));
			applyIfNeeded(confirmed, patch);
			applyIfNeeded(desired, patch);
			hasSentContext = true;
		},
	};
}

function fullContextPatch(context: Context): ContextPatch {
	return copyContext(context);
}

function diffContext(confirmed: Context, desired: Context): ContextPatch {
	const patch: ContextPatch = {};
	if (confirmed.systemPrompt !== desired.systemPrompt) {
		patch.systemPrompt = desired.systemPrompt;
	}
	if (!structurallyEqual(confirmed.messages, desired.messages)) {
		patch.messages = [...desired.messages];
	}
	if (!structurallyEqual(confirmed.tools, desired.tools)) {
		patch.tools = [...desired.tools];
	}

	const config = diffConfig(confirmed.config, desired.config);
	if (Object.keys(config).length > 0) {
		patch.config = config;
	}
	return patch;
}

function diffConfig(
	confirmed: LLMConfig,
	desired: LLMConfig,
): Partial<LLMConfig> {
	const patch: Partial<LLMConfig> = {};
	if ('model' in desired && confirmed.model !== desired.model) {
		patch.model = desired.model;
	}
	if ('provider' in desired && confirmed.provider !== desired.provider) {
		patch.provider = desired.provider;
	}
	if ('reasoning' in desired && confirmed.reasoning !== desired.reasoning) {
		patch.reasoning = desired.reasoning;
	}
	if ('apiKey' in desired && confirmed.apiKey !== desired.apiKey) {
		patch.apiKey = desired.apiKey;
	}
	return patch;
}

function isEmptyPatch(patch: ContextPatch): boolean {
	return (
		patch.systemPrompt === undefined &&
		patch.messages === undefined &&
		patch.tools === undefined &&
		patch.config === undefined
	);
}

function applyIfNeeded(tracker: ContextTracker, patch: ContextPatch): void {
	if (patchMatchesContext(tracker.get(), patch)) return;
	tracker.apply(copyContextPatch(patch));
}

function patchMatchesContext(context: Context, patch: ContextPatch): boolean {
	if (
		patch.systemPrompt !== undefined &&
		context.systemPrompt !== patch.systemPrompt
	) {
		return false;
	}
	if (
		patch.messages !== undefined &&
		!structurallyEqual(context.messages, patch.messages)
	) {
		return false;
	}
	if (
		patch.tools !== undefined &&
		!structurallyEqual(context.tools, patch.tools)
	) {
		return false;
	}
	return (
		patch.config === undefined || configPatchMatches(context, patch.config)
	);
}

function configPatchMatches(
	context: Context,
	config: Partial<LLMConfig>,
): boolean {
	for (const key of ['model', 'provider', 'reasoning', 'apiKey'] as const) {
		if (key in config && context.config[key] !== config[key]) return false;
	}
	return true;
}

function structurallyEqual(
	left: readonly Message[] | readonly ToolDefinition[],
	right: readonly Message[] | readonly ToolDefinition[],
): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}
