import { z } from 'zod';
import type { Codec } from '@franklin/lib';
import { versioned, zodCodec } from '@franklin/lib';

// ---------------------------------------------------------------------------
// Version 1 — initial schema
// ---------------------------------------------------------------------------

const ThinkingLevel = z.enum([
	'off',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
]);

// Defaults live inside the schema so minor evolution (adding an optional
// field, dropping a retired one) stays a non-event: zod fills missing
// fields during decode, unknown fields drop silently. Version bumps are
// reserved for structural changes that need a real migration.
const AppSettingsV1 = z.object({
	defaultLLMConfig: z
		.object({
			provider: z.string().default('openai-codex'),
			model: z.string().default('gpt-5.4'),
			reasoning: ThinkingLevel.default('medium'),
		})
		.prefault({}),
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
