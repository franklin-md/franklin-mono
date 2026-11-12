import type { DeepPartial } from '@franklin/lib';
import type { FranklinExtension, FranklinState } from '../../types.js';

export type CreateAgentInput = {
	readonly extensions: readonly FranklinExtension[];
	readonly state?: DeepPartial<FranklinState>;
};
