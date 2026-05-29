import { storeKey } from '../../modules/store/api/key.js';
import type { ViewingContextState } from './types.js';

export const viewingContextKey = storeKey<
	'viewingContext',
	ViewingContextState
>('viewingContext');
