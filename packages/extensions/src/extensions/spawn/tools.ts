import { z } from 'zod';
import { toolSpec } from '../../api/core/tool-spec.js';
import { spawnDescription } from '../system_prompts.js';

export const spawnSpec = toolSpec('spawn', spawnDescription, z.object({}));
