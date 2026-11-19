import type { ModelSelection } from '../../../shared/model/selection.js';
import { openSettingsFile } from '../../../shared/settings/open.js';
import type { SettingsFile } from '../../../shared/settings/types.js';
import type { SingleFilePersister } from '@franklin/lib';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import type { InboxSettings } from '../controller/types.js';
import { inboxSettingsSchema } from './schema.js';

export function openInboxSettings(
	persistence: SingleFilePersister<InboxSettings>,
	defaults: ModelSelection,
): Promise<SettingsFile<InboxSettings>> {
	return openSettingsFile({
		name: 'Inbox settings',
		persistence,
		schema: inboxSettingsSchema,
		defaults: {
			...defaults,
			answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
			concurrency: 3,
			actions: [],
		},
	});
}
