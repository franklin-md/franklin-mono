import { useModelSelection, useThinkingLevel } from '@franklin/react';
import { ModelPicker } from './picker.js';

export function ModelSelector() {
	const { provider, model, setModel } = useModelSelection();
	const { level, levels, setLevel } = useThinkingLevel();
	return (
		<ModelPicker
			value={{ provider, model }}
			onChange={(next) => {
				void setModel(next.provider, next.model);
			}}
			effort={{
				value: level,
				levels,
				onChange: (next) => {
					void setLevel(next);
				},
			}}
		/>
	);
}
