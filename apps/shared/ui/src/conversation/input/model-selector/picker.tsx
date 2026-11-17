import { MODEL_CATALOG } from '../models/catalog.js';
import { ProviderAuthAction } from './auth-shortcut/index.js';
import { ModelPickerContent } from './content.js';
import { ModelPickerEffort } from './effort.js';
import { ModelPickerFooter } from './footer.js';
import { ModelPickerList } from './list.js';
import { ModelPickerModels } from './models.js';
import { ModelPickerRoot } from './root.js';
import { ModelPickerSearch } from './search.js';
import { ModelPickerTrigger } from './trigger.js';
import type { ModelPickerProps, ProviderActionRenderer } from './types.js';

const renderAuthAction: ProviderActionRenderer = (group) => (
	<ProviderAuthAction {...group} />
);

export function ModelPicker({
	provider,
	model,
	onSelect,
	label,
	catalog = MODEL_CATALOG,
	renderProviderAction = renderAuthAction,
	effort,
}: ModelPickerProps) {
	return (
		<ModelPickerRoot
			catalog={catalog}
			provider={provider}
			model={model}
			onSelect={onSelect}
		>
			<ModelPickerTrigger aria-label={label} effort={effort?.level} />
			<ModelPickerContent>
				<ModelPickerModels>
					<ModelPickerSearch />
					<ModelPickerList renderProviderAction={renderProviderAction} />
				</ModelPickerModels>
				{effort && (
					<ModelPickerFooter>
						<ModelPickerEffort {...effort} />
					</ModelPickerFooter>
				)}
			</ModelPickerContent>
		</ModelPickerRoot>
	);
}
