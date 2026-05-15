import type { AuthEntry, AuthManager } from '@franklin/agent/browser';
import type { PDFConverter, PDFInput } from '@franklin/extensions';
import { describe, expect, it, vi } from 'vitest';

import { createObsidianPDFConverter } from '../pdf/converters.js';

type AuthListener = (provider: string, entry: AuthEntry | undefined) => void;

function createAuth(initialMistralKey?: string): {
	auth: AuthManager;
	emit: AuthListener;
	setMistralKey(key: string | undefined): void;
	unsubscribe: ReturnType<typeof vi.fn>;
} {
	const listeners: AuthListener[] = [];
	const unsubscribe = vi.fn();
	let mistralKey = initialMistralKey;
	const auth = {
		entries: () =>
			mistralKey
				? {
						mistral: {
							apiKey: {
								type: 'apiKey' as const,
								key: mistralKey,
							},
						},
					}
				: {},
		onAuthChange: (listener: AuthListener) => {
			listeners.push(listener);
			return unsubscribe;
		},
	} as unknown as AuthManager;

	return {
		auth,
		emit(provider, entry) {
			for (const listener of listeners) {
				listener(provider, entry);
			}
		},
		setMistralKey(key) {
			mistralKey = key;
		},
		unsubscribe,
	};
}

function apiKeyEntry(key: string): AuthEntry {
	return {
		apiKey: {
			type: 'apiKey',
			key,
		},
	};
}

function createConverter(markdown: string): PDFConverter & {
	convertPDF: ReturnType<typeof vi.fn>;
} {
	return {
		convertPDF: vi.fn(
			async (): Promise<PDFInput> => ({
				markdown,
				screenshots: [],
			}),
		),
	};
}

describe('createObsidianPDFConverter', () => {
	it('starts with the free converter when no Mistral key exists', async () => {
		const { auth } = createAuth();
		const free = createConverter('free');
		const createFreeConverter = vi.fn(() => free);
		const createMistralConverter = vi.fn();
		const converter = createObsidianPDFConverter(auth, {
			renderScreenshots: vi.fn(async () => []),
			createFreeConverter,
			createMistralConverter,
		});

		const result = await converter.convertPDF(new Uint8Array([1]));

		expect(result.markdown).toBe('free');
		expect(free.convertPDF).toHaveBeenCalledOnce();
		expect(createFreeConverter).toHaveBeenCalledOnce();
		expect(createMistralConverter).not.toHaveBeenCalled();
	});

	it('starts with Mistral when a key exists before startup', async () => {
		const { auth } = createAuth('mis-existing');
		const mistral = createConverter('mistral');
		const createMistralConverter = vi.fn(() => mistral);
		const converter = createObsidianPDFConverter(auth, {
			renderScreenshots: vi.fn(async () => []),
			createFreeConverter: vi.fn(() => createConverter('free')),
			createMistralConverter,
		});

		const result = await converter.convertPDF(new Uint8Array([1]));

		expect(result.markdown).toBe('mistral');
		expect(createMistralConverter).toHaveBeenCalledWith(
			'mis-existing',
			expect.any(Function),
		);
		expect(mistral.convertPDF).toHaveBeenCalledOnce();
	});

	it('swaps to Mistral when the key is added', async () => {
		const { auth, emit } = createAuth();
		const free = createConverter('free');
		const mistral = createConverter('mistral');
		const converter = createObsidianPDFConverter(auth, {
			renderScreenshots: vi.fn(async () => []),
			createFreeConverter: vi.fn(() => free),
			createMistralConverter: vi.fn(() => mistral),
		});

		emit('mistral', apiKeyEntry('mis-new'));
		const result = await converter.convertPDF(new Uint8Array([1]));

		expect(result.markdown).toBe('mistral');
		expect(free.convertPDF).not.toHaveBeenCalled();
		expect(mistral.convertPDF).toHaveBeenCalledOnce();
	});

	it('refreshes from restored auth entries without an auth change event', async () => {
		const { auth, setMistralKey } = createAuth();
		const free = createConverter('free');
		const mistral = createConverter('mistral');
		const converter = createObsidianPDFConverter(auth, {
			renderScreenshots: vi.fn(async () => []),
			createFreeConverter: vi.fn(() => free),
			createMistralConverter: vi.fn(() => mistral),
		});

		setMistralKey('mis-restored');
		converter.refresh();
		const result = await converter.convertPDF(new Uint8Array([1]));

		expect(result.markdown).toBe('mistral');
		expect(mistral.convertPDF).toHaveBeenCalledOnce();
		expect(free.convertPDF).not.toHaveBeenCalled();
	});

	it('swaps to a new Mistral converter when the key changes', async () => {
		const { auth, emit } = createAuth('mis-old');
		const first = createConverter('first');
		const second = createConverter('second');
		const createMistralConverter = vi
			.fn()
			.mockReturnValueOnce(first)
			.mockReturnValueOnce(second);
		const converter = createObsidianPDFConverter(auth, {
			renderScreenshots: vi.fn(async () => []),
			createFreeConverter: vi.fn(() => createConverter('free')),
			createMistralConverter,
		});

		emit('mistral', apiKeyEntry('mis-new'));
		const result = await converter.convertPDF(new Uint8Array([1]));

		expect(result.markdown).toBe('second');
		expect(createMistralConverter).toHaveBeenCalledTimes(2);
		expect(createMistralConverter).toHaveBeenNthCalledWith(
			1,
			'mis-old',
			expect.any(Function),
		);
		expect(createMistralConverter).toHaveBeenNthCalledWith(
			2,
			'mis-new',
			expect.any(Function),
		);
	});

	it('swaps back to free when the key is removed', async () => {
		const { auth, emit } = createAuth('mis-existing');
		const free = createConverter('free');
		const mistral = createConverter('mistral');
		const converter = createObsidianPDFConverter(auth, {
			renderScreenshots: vi.fn(async () => []),
			createFreeConverter: vi.fn(() => free),
			createMistralConverter: vi.fn(() => mistral),
		});

		emit('mistral', undefined);
		const result = await converter.convertPDF(new Uint8Array([1]));

		expect(result.markdown).toBe('free');
		expect(free.convertPDF).toHaveBeenCalledOnce();
		expect(mistral.convertPDF).not.toHaveBeenCalled();
	});

	it('ignores non-Mistral auth changes and unsubscribes on dispose', () => {
		const { auth, emit, unsubscribe } = createAuth();
		const createMistralConverter = vi.fn();
		const converter = createObsidianPDFConverter(auth, {
			renderScreenshots: vi.fn(async () => []),
			createFreeConverter: vi.fn(() => createConverter('free')),
			createMistralConverter,
		});

		emit('openrouter', apiKeyEntry('sk-or'));
		converter.dispose();

		expect(createMistralConverter).not.toHaveBeenCalled();
		expect(unsubscribe).toHaveBeenCalledOnce();
	});
});
