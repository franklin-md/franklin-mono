import { defineExtension } from '@franklin/agent';
import type { CoreModule } from '@franklin/agent';
import type { AnswerRequest } from '../../controller/types.js';
import type { EvidenceRepository, ResearchEvidence } from './types.js';
import { redactEvidence } from './redact.js';

const researchTools = new Set([
	'read_file',
	'glob',
	'grep',
	'search_web',
	'fetch_url',
]);
const MAX_EVENTS = 256;
const MAX_CHARACTERS = 1_000_000;
const MAX_FIELD = 64_000;

export class ResearchRecorder {
	private readonly evidence: ResearchEvidence;
	private remaining = MAX_CHARACTERS;
	private secrets: string[] = [];
	private writes = Promise.resolve();
	private sealed = false;

	constructor(
		request: AnswerRequest,
		prompt: string,
		private readonly repository: EvidenceRepository,
	) {
		this.evidence = {
			version: 1,
			question: structuredClone(request.question),
			ancestors: structuredClone(request.ancestors),
			startedAt: Date.now(),
			status: 'collecting',
			missing: [],
			prompt: this.bound(prompt),
			events: [],
			omittedEvents: 0,
		};
	}

	readonly extension = defineExtension<[CoreModule]>((api) => {
		api.on('toolCall', ({ call }) => {
			if (this.sealed || !researchTools.has(call.name)) return;
			if (this.evidence.events.length >= MAX_EVENTS || this.remaining <= 0) {
				this.evidence.omittedEvents++;
				return;
			}
			this.evidence.events.push({
				callId: call.id,
				name: call.name,
				calledAt: Date.now(),
				arguments: this.bound(JSON.stringify(call.arguments)),
			});
			this.checkpoint();
		});
		api.on('toolResult', ({ call, result }) => {
			if (this.sealed) return;
			const event = this.evidence.events.find(
				(event) => event.callId === call.id,
			);
			if (!event) return;
			event.resultAt = Date.now();
			event.isError = !!result.isError;
			// Store exactly the tool-visible text. Binary bodies are represented by
			// an explicit omission, rather than hidden reasoning or base64 payloads.
			event.result = this.bound(
				JSON.stringify(
					result.content.map((part) =>
						part.type === 'text'
							? part
							: { type: part.type, omitted: 'Binary tool result not retained' },
					),
				),
			);
			if (result.content.some((part) => part.type !== 'text'))
				this.evidence.missing.push(`Binary content omitted for ${call.id}`);
			this.checkpoint();
		});
	});

	setSecret(secret: string): void {
		this.secrets.push(secret);
		const clean = redactEvidence(this.evidence.prompt.text, this.secrets);
		if (clean !== this.evidence.prompt.text) {
			this.evidence.prompt.text = clean;
			this.evidence.prompt.redacted = true;
		}
	}

	setSystemPrompt(prompt: string): void {
		if (!this.sealed && !this.evidence.systemPrompt)
			this.evidence.systemPrompt = this.bound(prompt);
	}

	async save(): Promise<void> {
		const snapshot: ResearchEvidence = JSON.parse(
			JSON.stringify(this.evidence, (_key, value: unknown) =>
				typeof value === 'string' ? redactEvidence(value, this.secrets) : value,
			),
		);
		const write = this.writes.then(() => this.repository.save(snapshot));
		this.writes = write.catch(() => {});
		await write;
	}

	async accept(): Promise<void> {
		if (this.sealed) return this.save();
		this.sealed = true;
		this.evidence.acceptedAt = Date.now();
		const incomplete = this.evidence.events.some(
			(event) => event.resultAt === undefined,
		);
		if (incomplete)
			this.evidence.missing.push(
				'Some tool calls had not completed when the answer was accepted',
			);
		if (!this.evidence.systemPrompt)
			this.evidence.missing.push('System prompt unavailable');
		this.evidence.status =
			this.evidence.missing.length || this.truncated() ? 'partial' : 'complete';
		await this.save();
	}

	async interrupt(): Promise<void> {
		if (this.sealed) return;
		this.sealed = true;
		this.evidence.status = 'partial';
		this.evidence.missing.push('Attempt ended without an accepted answer');
		await this.save();
	}

	private checkpoint(): void {
		void this.save().catch(() => {});
	}

	private bound(value: string): ResearchEvidence['prompt'] {
		const clean = redactEvidence(value, this.secrets);
		const limit = Math.min(MAX_FIELD, this.remaining);
		const text = clean.slice(0, limit);
		this.remaining -= text.length;
		return {
			text,
			omittedCharacters: clean.length - text.length,
			redacted: clean !== value,
		};
	}

	private truncated(): boolean {
		return (
			this.evidence.omittedEvents > 0 ||
			[
				this.evidence.prompt,
				this.evidence.systemPrompt,
				...this.evidence.events.flatMap((event) => [
					event.arguments,
					event.result,
				]),
			].some((field) => field && field.omittedCharacters > 0)
		);
	}
}
