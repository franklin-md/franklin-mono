import { useModelSelection } from '@franklin/react';
import { ModelPicker } from './picker.js';

export function ModelSelector() {
	const { provider, model, setModel } = useModelSelection();
	return (
		<ModelPicker
			provider={provider}
			model={model}
			onSelect={(provider, model) => {
				void setModel(provider, model);
			}}
		/>
	);
}
