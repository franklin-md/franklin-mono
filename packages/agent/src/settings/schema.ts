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

const AppSettingsV1 = z
	.object({
		defaultLLMConfig: z
			.object({
				model: z.string().optional(),
				provider: z.string().optional(),
				reasoning: ThinkingLevel.optional(),
			})
			.strict(),
	})
	.strict();

type AppSettingsV1T = z.infer<typeof AppSettingsV1>;

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/** Latest version — external consumers see this type. */
export type AppSettings = AppSettingsV1T;

export const DEFAULT_APP_SETTINGS: AppSettings = {
	defaultLLMConfig: {
		provider: 'openai-codex',
		model: 'gpt-5.4',
		reasoning: 'medium',
	},
};

export const appSettingsCodec: Codec<AppSettings> = versioned()
	.version(1, zodCodec(AppSettingsV1))
	.build();
