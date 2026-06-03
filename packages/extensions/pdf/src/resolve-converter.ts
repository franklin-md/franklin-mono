import type { AuthDependencyRuntime } from '@franklin/agent';
import { FreePDFConverter } from './providers/free.js';
import { MistralPDFConverter } from './providers/mistral.js';
import type { PDFConverter, RenderPDFScreenshots } from './types.js';

const MISTRAL_PROVIDER = 'mistral';

export type PDFConverterRuntime = AuthDependencyRuntime;

export function createPDFConverterResolver({
	renderScreenshots,
}: {
	readonly renderScreenshots: RenderPDFScreenshots;
}): (runtime: PDFConverterRuntime) => Promise<PDFConverter> {
	const freeConverter = new FreePDFConverter({ renderScreenshots });

	return async (runtime) => {
		const apiKey = await runtime.auth.getApiKey(MISTRAL_PROVIDER);
		return apiKey
			? new MistralPDFConverter({ apiKey, renderScreenshots })
			: freeConverter;
	};
}
