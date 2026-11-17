import { THINKING_LEVELS } from '@franklin/mini-acp';
import { z } from 'zod';
import type { Codec } from '@franklin/lib';
import { versioned, zodCodec } from '@franklin/lib';

// ---------------------------------------------------------------------------
// Version 1 — initial schema
// ---------------------------------------------------------------------------

const ThinkingLevel = z.enum(THINKING_LEVELS);

const CODEX_DEFAULT_MODEL_UPGRADES = new Map([
	['gpt-6-astra', 'gpt-6.2-astra'],
	['gpt-6.1-sol', 'gpt-6.2-sol'],
]);

// TODO(FRA-350): Move app-specific settings out of @franklin/agent. The agent
// package currently owns this schema because FranklinApp owns persistence.
// Defaults live inside the schema so minor evolution (adding an optional
// field, dropping a retired one) stays a non-event: zod fills missing
// fields during decode, unknown fields drop silently. Version bumps are
// reserved for structural changes that need a real migration.
const AppSettingsV1 = z.object({
	shareViewedReferencesByDefault: z.boolean().default(true),
	defaultLLMConfig: z
		.object({
			provider: z.string().default('openai-codex'),
			model: z.string().optional(),
			reasoning: ThinkingLevel.default('medium'),
		})
		.prefault({})
		.transform((config) => {
			if (config.provider !== 'openai-codex') {
				// Preserve the existing fallback when a different provider was saved
				// without a model. Pi's OpenAI API catalog still resolves this ID.
				return { ...config, model: config.model ?? 'gpt-6.1-sol' };
			}
			const model = config.model ?? 'gpt-6.2-sol';
			return {
				...config,
				model: CODEX_DEFAULT_MODEL_UPGRADES.get(model) ?? model,
			};
		}),
});

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/** Latest version — external consumers see this fully-hydrated type. */
export type AppSettings = z.infer<typeof AppSettingsV1>;

/** Canonical defaults, reconstructed from the schema. */
export const DEFAULT_APP_SETTINGS: AppSettings = AppSettingsV1.parse({});

export const appSettingsCodec: Codec<AppSettings> = versioned()
	.version(1, zodCodec(AppSettingsV1))
	.build();
