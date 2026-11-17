import { useModelSelection, useThinkingLevel } from '@franklin/react';
import { ModelPicker } from './picker.js';

export function ModelSelector() {
	const { provider, model, setModel } = useModelSelection();
	const { level, levels, setLevel } = useThinkingLevel();
	return (
		<ModelPicker
			provider={provider}
			model={model}
			onSelect={(provider, model) => {
				void setModel(provider, model);
			}}
			effort={{
				level,
				levels,
				onChange: (next) => {
					void setLevel(next);
				},
			}}
		/>
	);
}
