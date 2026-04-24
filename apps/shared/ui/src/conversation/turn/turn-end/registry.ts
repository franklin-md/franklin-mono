import { StopCode } from '@franklin/mini-acp';
import type { TurnEndRendererRegistry } from '@franklin/react';

import {
	CancelledRenderer,
	ErrorRenderer,
	FinishedRenderer,
} from './renderers.js';

export const defaultRegistry: TurnEndRendererRegistry = {
	byCode: {
		[StopCode.Finished]: FinishedRenderer,
		[StopCode.Cancelled]: CancelledRenderer,
	},
	default: ErrorRenderer,
};
