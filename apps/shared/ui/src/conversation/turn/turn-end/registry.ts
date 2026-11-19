import { StopCode } from '@franklin/mini-acp';
import type { TurnEndRendererRegistry } from '@franklin/react';

import {
	AuthRenderer,
	CancelledRenderer,
	ErrorRenderer,
	FinishedRenderer,
	MaxTokensRenderer,
} from './renderers.js';

export const defaultRegistry: TurnEndRendererRegistry = {
	byCode: {
		[StopCode.Finished]: FinishedRenderer,
		[StopCode.Cancelled]: CancelledRenderer,
		[StopCode.MaxTokens]: MaxTokensRenderer,
		[StopCode.AuthKeyNotSpecified]: AuthRenderer,
		[StopCode.AuthKeyInvalid]: AuthRenderer,
	},
	default: ErrorRenderer,
};
