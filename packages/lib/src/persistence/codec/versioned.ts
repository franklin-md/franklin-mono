import type { Codec, DecodeIssue, DecodeResult } from './types.js';

// ---------------------------------------------------------------------------
// Versioned codec — builder pattern chaining (version, codec, migrate) steps.
// Disk format: { version: number, data: unknown }. Reads walk migrations up
// to current; writes always emit current version.
// ---------------------------------------------------------------------------

interface Step {
	version: number;
	codec: Codec<unknown>;
	migrate?: (prev: unknown) => unknown;
}

interface Envelope {
	version: number;
	data: unknown;
}

export interface VersionedBuilder<Current> {
	version<Next>(
		n: number,
		codec: Codec<Next>,
		migrate: (prev: Current) => Next,
	): VersionedBuilder<Next>;
	build(): Codec<Current>;
}

export interface InitialVersionedBuilder {
	version<T>(n: number, codec: Codec<T>): VersionedBuilder<T>;
}

export function versioned(): InitialVersionedBuilder {
	return {
		version<T>(n: number, codec: Codec<T>): VersionedBuilder<T> {
			return makeBuilder<T>([{ version: n, codec: codec as Codec<unknown> }]);
		},
	};
}

function makeBuilder<Current>(steps: Step[]): VersionedBuilder<Current> {
	return {
		version<Next>(
			n: number,
			codec: Codec<Next>,
			migrate: (prev: Current) => Next,
		): VersionedBuilder<Next> {
			return makeBuilder<Next>([
				...steps,
				{
					version: n,
					codec: codec as Codec<unknown>,
					migrate: migrate as (prev: unknown) => unknown,
				},
			]);
		},
		build(): Codec<Current> {
			return new VersionedCodec<Current>(steps);
		},
	};
}

class VersionedCodec<T> implements Codec<T> {
	private readonly sorted: Step[];
	private readonly current: Step;
	private readonly byVersion: Map<number, Step>;

	constructor(steps: Step[]) {
		this.sorted = [...steps].sort((a, b) => a.version - b.version);
		const current = this.sorted[this.sorted.length - 1];
		if (!current) throw new Error('versioned() requires at least one version');
		this.current = current;
		this.byVersion = new Map(this.sorted.map((s) => [s.version, s]));
	}

	encode(value: T): unknown {
		return {
			version: this.current.version,
			data: this.current.codec.encode(value),
		};
	}

	decode(raw: unknown): DecodeResult<T> {
		const envelope = this.parseEnvelope(raw);
		if (!envelope.ok) return envelope;

		const startStep = this.findStartStep(envelope.value.version);
		if (!startStep.ok) return startStep;

		const decoded = this.decodeAtVersion(startStep.value, envelope.value.data);
		if (!decoded.ok) return decoded;

		return this.migrateAndValidate(decoded.value, envelope.value.version);
	}

	private parseEnvelope(raw: unknown): DecodeResult<Envelope> {
		if (raw === null || typeof raw !== 'object') {
			return this.fail({
				kind: 'envelope-invalid',
				error: 'expected object with numeric `version` and `data` fields',
			});
		}
		const r = raw as Record<string, unknown>;
		if (typeof r.version !== 'number' || !('data' in r)) {
			return this.fail({
				kind: 'envelope-invalid',
				error: 'expected object with numeric `version` and `data` fields',
			});
		}
		return { ok: true, value: { version: r.version, data: r.data } };
	}

	private findStartStep(envVersion: number): DecodeResult<Step> {
		if (envVersion > this.current.version) {
			return this.fail({
				kind: 'version-ahead',
				version: envVersion,
				currentVersion: this.current.version,
			});
		}
		const step = this.byVersion.get(envVersion);
		if (!step) {
			return this.fail({ kind: 'missing-migration', version: envVersion });
		}
		return { ok: true, value: step };
	}

	private decodeAtVersion(step: Step, data: unknown): DecodeResult<unknown> {
		const result = step.codec.decode(data);
		if (!result.ok) {
			return this.fail(attachVersion(result.issue, step.version));
		}
		return result;
	}

	private migrateAndValidate(
		value: unknown,
		fromVersion: number,
	): DecodeResult<T> {
		let migrated: unknown = value;
		const startIdx = this.sorted.findIndex((s) => s.version === fromVersion);
		for (const step of this.sorted.slice(startIdx + 1)) {
			if (!step.migrate) {
				return this.fail({
					kind: 'missing-migration',
					version: step.version,
				});
			}
			migrated = step.migrate(migrated);
		}

		// Re-validate at current version to catch buggy migrations.
		const final = this.current.codec.decode(migrated);
		if (!final.ok) {
			return this.fail(attachVersion(final.issue, this.current.version));
		}
		return { ok: true, value: final.value as T };
	}

	private fail(issue: DecodeIssue): DecodeResult<never> {
		return { ok: false, issue };
	}
}

function attachVersion(issue: DecodeIssue, version: number): DecodeIssue {
	if (issue.kind === 'schema-mismatch') return { ...issue, version };
	return issue;
}
