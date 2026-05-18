import { z } from 'zod';

import { toolSpec } from '../../modules/core/api/tool-spec.js';
import { setChatTitleDescription } from '../system_prompts.js';
import { MAX_CONVERSATION_TITLE_LENGTH } from './types.js';

export const setChatTitleSpec = toolSpec(
	'set_chat_title',
	setChatTitleDescription,
	z.object({
		title: z
			.string()
			.min(1)
			.max(MAX_CONVERSATION_TITLE_LENGTH)
			.describe('Short title to show for this chat'),
	}),
);
