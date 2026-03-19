import type { Agent } from '../../../agent/types.js';
import type { ExtensionList } from '../../types/extension.js';

export type SpawnPoint<E extends ExtensionList> = () => Promise<Agent<E>>;
