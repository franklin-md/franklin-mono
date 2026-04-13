import { StopCode } from '@franklin/mini-acp';
import type { TurnEndRendererRegistry } from '@franklin/react';

import {
	finishedRenderer,
	cancelledRenderer,
	errorRenderer,
} from './renderers.js';

export const defaultRegistry: TurnEndRendererRegistry = {
	byCode: {
		[StopCode.Finished]: finishedRenderer,
		[StopCode.Cancelled]: cancelledRenderer,
	},
	default: errorRenderer,
};
