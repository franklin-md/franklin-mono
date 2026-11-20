import type { PromptPreset } from './types.js';

// A blank draft for the settings editor. Storage migrations hard-code their
// own appearance, so changing this default does not rewrite saved presets.
export function createPreset(): PromptPreset {
	return {
		id: crypto.randomUUID(),
		name: '',
		prompt: '',
		icon: 'lucide-sparkles',
		color: 'blue',
	};
}
