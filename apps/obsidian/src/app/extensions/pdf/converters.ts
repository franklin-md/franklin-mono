import type { AuthManager } from '@franklin/agent/browser';
import {
	FreePDFConverter,
	MistralPDFConverter,
	type PDFConvertOptions,
	type PDFConverter,
	type PDFInput,
	type RenderPDFScreenshots,
} from '@franklin/extensions';

const MISTRAL_PROVIDER = 'mistral';
const FREE_PDF_SERVICE = 'free';
const MISTRAL_PDF_SERVICE = 'mistral';

export interface ObsidianPDFConverter extends PDFConverter {
	refresh(): void;
	dispose(): void;
}

export interface ObsidianPDFConverterOptions {
	readonly renderScreenshots: RenderPDFScreenshots;
	readonly createFreeConverter: (
		renderScreenshots: RenderPDFScreenshots,
	) => PDFConverter;
	readonly createMistralConverter: (
		apiKey: string,
		renderScreenshots: RenderPDFScreenshots,
	) => PDFConverter;
}

export function createObsidianPDFConverter(
	auth: AuthManager,
	options: ObsidianPDFConverterOptions,
): ObsidianPDFConverter {
	return new AuthSwitchingPDFConverter(auth, options);
}

class AuthSwitchingPDFConverter implements ObsidianPDFConverter {
	private readonly freeConverter: PDFConverter;
	private readonly unsubscribe: () => void;
	private current: PDFConverter;
	private currentService = FREE_PDF_SERVICE;
	private currentMistralKey: string | undefined;

	constructor(
		private readonly auth: AuthManager,
		private readonly options: ObsidianPDFConverterOptions,
	) {
		this.freeConverter = options.createFreeConverter(options.renderScreenshots);
		this.current = this.freeConverter;
		this.refresh();
		this.unsubscribe = auth.onAuthChange((provider, entry) => {
			if (provider !== MISTRAL_PROVIDER) return;
			this.configure(entry?.apiKey?.key);
		});
	}

	async convertPDF(
		pdf: Uint8Array,
		options: PDFConvertOptions = {},
	): Promise<PDFInput> {
		const converter = this.current;
		return converter.convertPDF(pdf, options);
	}

	refresh(): void {
		this.configure(this.auth.entries()[MISTRAL_PROVIDER]?.apiKey?.key);
	}

	dispose(): void {
		this.unsubscribe();
	}

	private configure(apiKey: string | undefined): void {
		if (!apiKey) {
			this.currentMistralKey = undefined;
			this.current = this.freeConverter;
			this.currentService = FREE_PDF_SERVICE;
			return;
		}

		if (apiKey === this.currentMistralKey) {
			return;
		}

		this.currentMistralKey = apiKey;
		this.current = this.options.createMistralConverter(
			apiKey,
			this.options.renderScreenshots,
		);
		this.currentService = MISTRAL_PDF_SERVICE;
	}
}

export function createObsidianFreePDFConverter(
	renderScreenshots: RenderPDFScreenshots,
): PDFConverter {
	return new FreePDFConverter({ renderScreenshots });
}

export function createObsidianMistralPDFConverter(
	apiKey: string,
	renderScreenshots: RenderPDFScreenshots,
): PDFConverter {
	return new MistralPDFConverter({ apiKey, renderScreenshots });
}
