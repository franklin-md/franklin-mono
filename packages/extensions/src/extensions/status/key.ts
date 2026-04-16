import { storeKey } from '../../systems/store/api/key.js';
import type { StatusState } from './types.js';

export const statusKey = storeKey<'status', StatusState>('status');
