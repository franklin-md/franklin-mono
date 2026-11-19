import { THINKING_LEVELS, type ThinkingLevel } from '@franklin/mini-acp';
import { z } from 'zod';

/**
 * Validates a saved thinking level. The retired `minimal` level (removed
 * 2026-11-19) is read as `low`, so settings, sessions and app data saved
 * before its removal still load.
 */
export const StoredThinkingLevel = z
	.enum([...THINKING_LEVELS, 'minimal'])
	.transform((level): ThinkingLevel => (level === 'minimal' ? 'low' : level));
