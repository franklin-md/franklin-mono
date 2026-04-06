import { z } from 'zod';
import { toolSpec } from '../../api/core/tool-spec.js';
import {
	addTodoDescription,
	completeTodoDescription,
	listTodosDescription,
} from '../system_prompts.js';

export const addTodoSpec = toolSpec(
	'add_todo',
	addTodoDescription,
	z.object({ text: z.string() }),
);

export const completeTodoSpec = toolSpec(
	'complete_todo',
	completeTodoDescription,
	z.object({ id: z.string() }),
);

export const listTodosSpec = toolSpec(
	'list_todos',
	listTodosDescription,
	z.object({}),
);
