import type {
	Context,
	ContextPatch,
	LLMConfig,
	Message,
	MiniACPClient,
	ToolDefinition,
	Usage,
} from '@franklin/mini-acp';
import { ContextTracker } from '@franklin/mini-acp/session';
import type { SessionSnapshot, ToolFilter } from '../state.js';
import type { SystemPromptBuilder } from './types.js';

type LLMConfigSnapshot = SessionSnapshot['llmConfig'];

export interface ToolDefinitionProvider {
	definitions(): readonly ToolDefinition[];
	filter(): ToolFilter;
}

type ContextLedgerInput = {
	readonly snapshot: SessionSnapshot;
	readonly systemPrompt: SystemPromptBuilder;
	readonly toolRegistry: ToolDefinitionProvider;
};

export class ContextLedger extends ContextTracker {
	private readonly acknowledged = new ContextTracker();
	private readonly target = new ContextTracker();
	private readonly systemPrompt: SystemPromptBuilder;
	private readonly toolRegistry: ToolDefinitionProvider;
	private hasSentContext = false;

	constructor({ snapshot, systemPrompt, toolRegistry }: ContextLedgerInput) {
		super();
		this.systemPrompt = systemPrompt;
		this.toolRegistry = toolRegistry;
		this.target.apply(
			contextFromSnapshot(snapshot, toolRegistry.definitions()),
		);
	}

	override get(): Context {
		return this.acknowledged.get();
	}

	override apply(patch: ContextPatch): void {
		this.recordAcknowledgedPatch(patch);
		this.onChange?.();
	}

	override append(message: Message): void {
		this.acknowledged.append(message);
		this.target.append(message);
		this.onChange?.();
	}

	override reset(): void {
		this.acknowledged.reset();
		this.target.reset();
		this.hasSentContext = false;
		this.onChange?.();
	}

	getSnapshot(usage: Usage): SessionSnapshot {
		const context = this.target.get();
		return sessionSnapshot(
			context.messages,
			pickLLMConfig(context.config),
			usage,
			this.toolRegistry.filter(),
		);
	}

	async sync(client: MiniACPClient): Promise<void> {
		const next = await this.targetContext();
		const patch = this.hasSentContext
			? diffContext(this.acknowledged.get(), next)
			: copyContext(next);
		if (isEmptyPatch(patch)) return;

		await client.setContext(copyContextPatch(patch));
		this.recordAcknowledgedPatch(patch);
		this.hasSentContext = true;
	}

	private async targetContext(): Promise<Context> {
		const base = this.target.get();
		const systemPrompt = await this.systemPrompt.build();
		return {
			systemPrompt: systemPrompt ?? base.systemPrompt,
			messages: [...base.messages],
			tools: [...this.toolRegistry.definitions()],
			config: { ...base.config },
		};
	}

	private recordAcknowledgedPatch(patch: ContextPatch): void {
		applyIfNeeded(this.acknowledged, patch);
		applyIfNeeded(this.target, patch);
	}
}

function contextFromSnapshot(
	snapshot: SessionSnapshot,
	tools: readonly ToolDefinition[],
): Context {
	return {
		systemPrompt: '',
		messages: [...snapshot.messages],
		tools: [...tools],
		config: { ...snapshot.llmConfig },
	};
}

function copyContext(context: Context): ContextPatch {
	return {
		systemPrompt: context.systemPrompt,
		messages: [...context.messages],
		tools: [...context.tools],
		config: { ...context.config },
	};
}

function copyContextPatch(patch: ContextPatch): ContextPatch {
	const copy: ContextPatch = {};
	if (patch.systemPrompt !== undefined) copy.systemPrompt = patch.systemPrompt;
	if (patch.messages !== undefined) copy.messages = [...patch.messages];
	if (patch.tools !== undefined) copy.tools = [...patch.tools];
	if (patch.config !== undefined) copy.config = { ...patch.config };
	return copy;
}

function diffContext(acknowledged: Context, target: Context): ContextPatch {
	const patch: ContextPatch = {};
	if (acknowledged.systemPrompt !== target.systemPrompt) {
		patch.systemPrompt = target.systemPrompt;
	}
	if (!structurallyEqual(acknowledged.messages, target.messages)) {
		patch.messages = [...target.messages];
	}
	if (!structurallyEqual(acknowledged.tools, target.tools)) {
		patch.tools = [...target.tools];
	}

	const config = diffConfig(acknowledged.config, target.config);
	if (Object.keys(config).length > 0) {
		patch.config = config;
	}
	return patch;
}

function diffConfig(
	acknowledged: LLMConfig,
	target: LLMConfig,
): Partial<LLMConfig> {
	const patch: Partial<LLMConfig> = {};
	for (const key of Object.keys(target) as (keyof LLMConfig)[]) {
		if (acknowledged[key] !== target[key]) {
			setConfigPatchValue(patch, key, target[key]);
		}
	}
	return patch;
}

function setConfigPatchValue<Key extends keyof LLMConfig>(
	patch: Partial<LLMConfig>,
	key: Key,
	value: LLMConfig[Key],
): void {
	patch[key] = value;
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
	for (const key of Object.keys(config) as (keyof LLMConfig)[]) {
		if (context.config[key] !== config[key]) return false;
	}
	return true;
}

function structurallyEqual(
	left: readonly Message[] | readonly ToolDefinition[],
	right: readonly Message[] | readonly ToolDefinition[],
): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function pickLLMConfig(cfg: LLMConfig): LLMConfigSnapshot {
	return {
		model: cfg.model,
		provider: cfg.provider,
		reasoning: cfg.reasoning,
	};
}

function sessionSnapshot(
	messages: readonly Message[],
	llmConfig: LLMConfigSnapshot,
	usage: Usage,
	toolFilter: ToolFilter,
): SessionSnapshot {
	return {
		messages: [...messages],
		llmConfig,
		usage: snapshotUsage(usage),
		toolFilter,
	};
}

function snapshotUsage(usage: Usage): Usage {
	return {
		tokens: { ...usage.tokens },
		cost: { ...usage.cost },
	};
}
