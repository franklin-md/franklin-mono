import { createSimpleContext } from '@franklin/react';
import type { ModelPickerContextValue } from './types.js';

export const [ModelPickerProvider, useModelPicker] =
	createSimpleContext<ModelPickerContextValue>('ModelPicker');
