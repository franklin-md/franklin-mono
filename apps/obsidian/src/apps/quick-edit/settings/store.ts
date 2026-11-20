import type { z } from 'zod';
import type { SingleFilePersister } from '@franklin/lib';
import { openSettingsFile } from '../../../shared/settings/open.js';
import type { SettingsFile } from '../../../shared/settings/types.js';
import type { QuickEditSettings } from '../types.js';
import { quickEditSettingsSchema } from './schema.js';

export type QuickEditPreferences = SettingsFile<QuickEditSettings>;

export function openQuickEditPreferences(
	persistence: SingleFilePersister<QuickEditSettings>,
	defaults: z.input<typeof quickEditSettingsSchema>,
): Promise<QuickEditPreferences> {
	return openSettingsFile({
		name: 'quick edit settings',
		persistence,
		schema: quickEditSettingsSchema,
		defaults,
	});
}
