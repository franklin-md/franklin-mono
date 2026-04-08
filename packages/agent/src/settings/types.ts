import type { LLMConfig } from '@franklin/mini-acp';

/** Persisted app-level settings (no secrets — apiKey is excluded). */
export type AppSettings = {
	defaultLLMConfig: Omit<LLMConfig, 'apiKey'>;
};
