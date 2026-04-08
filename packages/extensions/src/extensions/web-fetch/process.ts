import { Readability } from '@mozilla/readability';
import type { WebFetchResponse } from '../../api/environment/types.js';
import { JSDOM } from 'jsdom';
import {
	normalizeExtractedText,
	truncateText,
} from './normalize.js';
import type {
	ResolvedWebFetchExtensionOptions,
	WebFetchProcessedResult,
} from './types.js';

const PDF_MAGIC = '%PDF-';

export function processWebResponse(
	response: WebFetchResponse,
	options: ResolvedWebFetchExtensionOptions,
): WebFetchProcessedResult {
	if (response.status < 200 || response.status >= 300) {
		return createProcessedResult(response, {
			kind: 'http_error',
			text: `Request failed with HTTP status ${response.status} ${response.statusText}.`,
			isError: true,
			cacheable: false,
			truncated: false,
		});
	}

	switch (routeContent(response)) {
		case 'html':
			return extractHtml(response, options);
		case 'text':
			return extractPlainText(response, options);
		case 'pdf':
			return createProcessedResult(response, {
				kind: 'pdf',
				text: 'PDF parsing is not implemented yet for fetch_url.',
				isError: true,
				cacheable: false,
				truncated: false,
			});
		case 'unsupported':
			return createProcessedResult(response, {
				kind: 'unsupported',
				text: `Unsupported content type: ${response.contentType ?? 'unknown'}.`,
				isError: true,
				cacheable: false,
				truncated: false,
			});
	}
}

function extractHtml(
	response: WebFetchResponse,
	options: ResolvedWebFetchExtensionOptions,
): WebFetchProcessedResult {
	const html = decodeBody(response.body);
	const dom = new JSDOM(html, { url: response.finalUrl });

	try {
		const article = new Readability(dom.window.document).parse();
		const title = normalizeExtractedText(
			article?.title ?? dom.window.document.title ?? '',
		);
		const rawText =
			article?.textContent ?? dom.window.document.body?.textContent ?? '';
		const normalized = normalizeExtractedText(rawText);

		if (!normalized) {
			return createProcessedResult(response, {
				kind: 'error',
				title: title || undefined,
				text: 'Failed to extract readable HTML content.',
				isError: true,
				cacheable: false,
				truncated: false,
			});
		}

		const { text, truncated } = truncateText(normalized, options.maxOutputChars);
		return createProcessedResult(response, {
			kind: 'html',
			title: title || undefined,
			text,
			isError: false,
			cacheable: true,
			truncated,
		});
	} catch (error) {
		return createProcessedResult(response, {
			kind: 'error',
			text: `Failed to extract HTML content: ${toErrorMessage(error)}`,
			isError: true,
			cacheable: false,
			truncated: false,
		});
	} finally {
		dom.window.close();
	}
}

function extractPlainText(
	response: WebFetchResponse,
	options: ResolvedWebFetchExtensionOptions,
): WebFetchProcessedResult {
	const normalized = normalizeExtractedText(decodeBody(response.body));
	const { text, truncated } = truncateText(normalized, options.maxOutputChars);

	return createProcessedResult(response, {
		kind: 'text',
		text: text || '[empty response]',
		isError: false,
		cacheable: true,
		truncated,
	});
}

function routeContent(response: WebFetchResponse): 'html' | 'text' | 'pdf' | 'unsupported' {
	const type = normalizeContentType(response.contentType);
	if (type === 'text/html' || type === 'application/xhtml+xml') {
		return 'html';
	}
	if (type === 'text/plain') {
		return 'text';
	}
	if (type === 'application/pdf') {
		return 'pdf';
	}

	if (startsWithAscii(response.body, PDF_MAGIC)) {
		return 'pdf';
	}
	
	return 'unsupported';
}

function createProcessedResult(
	response: WebFetchResponse,
	result: {
		kind: WebFetchProcessedResult['kind'];
		title?: string;
		text: string;
		isError: boolean;
		cacheable: boolean;
		truncated: boolean;
	},
): WebFetchProcessedResult {
	return {
		requestedUrl: response.requestedUrl,
		finalUrl: response.finalUrl,
		status: response.status,
		statusText: response.statusText,
		contentType: response.contentType,
		title: result.title,
		kind: result.kind,
		text: result.text,
		truncated: result.truncated,
		isError: result.isError,
		cacheable: result.cacheable,
	};
}

function normalizeContentType(contentType?: string): string | undefined {
	return contentType?.split(';', 1)[0]?.trim().toLowerCase();
}

function decodeBody(body: Uint8Array): string {
	return new TextDecoder().decode(body);
}

function startsWithAscii(body: Uint8Array, prefix: string): boolean {
	return decodeBody(body.slice(0, prefix.length)) === prefix;
}

function looksLikePlainText(body: Uint8Array): boolean {
	let suspicious = 0;
	const sample = body.slice(0, 512);

	for (const byte of sample) {
		if (byte === 9 || byte === 10 || byte === 13) continue;
		if (byte < 32 || byte === 127) suspicious++;
	}

	return sample.length === 0 || suspicious / sample.length < 0.05;
}

function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
