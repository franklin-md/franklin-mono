import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelPickerRoot } from '../../../src/conversation/input/model-selector/root.js';
import { ModelPickerTrigger } from '../../../src/conversation/input/model-selector/trigger.js';
import { ModelPickerContent } from '../../../src/conversation/input/model-selector/content.js';
import { ModelPickerModels } from '../../../src/conversation/input/model-selector/models.js';
import { ModelPickerSearch } from '../../../src/conversation/input/model-selector/search.js';
import { ModelPickerList } from '../../../src/conversation/input/model-selector/list.js';
import { MODEL_CATALOG } from '../../../src/conversation/input/models/catalog.js';

beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
	HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('model picker composition without a harness or agent', () => {
	it.each([true, false])(
		'accepts a custom catalog, trigger and provider actions with search=%s',
		async (search) => {
			const onSelect = vi.fn();
			const catalog = MODEL_CATALOG.slice(0, 1);
			render(
				<ModelPickerRoot
					catalog={catalog}
					provider="custom"
					model="saved"
					onSelect={onSelect}
				>
					<ModelPickerTrigger asChild>
						<button>Choose</button>
					</ModelPickerTrigger>
					<ModelPickerContent>
						<ModelPickerModels>
							{search && <ModelPickerSearch />}
							<ModelPickerList
								renderProviderAction={(group) => (
									<button>{group.displayName} account</button>
								)}
							/>
						</ModelPickerModels>
					</ModelPickerContent>
				</ModelPickerRoot>,
			);
			fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
			expect(Boolean(screen.queryByRole('combobox'))).toBe(search);
			expect(
				screen.getByRole('button', { name: 'OpenAI Codex account' }),
			).toBeTruthy();
			expect(screen.queryByRole('button', { name: /OpenCode/ })).toBeNull();
			if (search)
				fireEvent.change(screen.getByRole('combobox'), {
					target: { value: 'GPT-6.1-Sol' },
				});
			fireEvent.click(
				await screen.findByRole('option', { name: 'GPT-6.1-Sol' }),
			);
			expect(onSelect).toHaveBeenCalledExactlyOnceWith(
				'openai-codex',
				'gpt-6.1-sol',
			);
			expect(screen.queryByRole('dialog')).toBeNull();
		},
	);
});
