import { storeKey } from '../../systems/store/api/key.js';
import type { Todo } from './types.js';

export const todoKey = storeKey<'todo', Todo[]>('todo');
