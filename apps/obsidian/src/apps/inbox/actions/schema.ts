import { promptPresetSchema } from '../../../shared/preset/schema.js';

// Saved action definitions from storage version 11. Names label one-line
// buttons on answered questions.
export const inboxActionSchema = promptPresetSchema.extend({
	name: promptPresetSchema.shape.name.refine(
		(name) => !/[\r\n]/.test(name),
		'Use a single-line action name',
	),
});
