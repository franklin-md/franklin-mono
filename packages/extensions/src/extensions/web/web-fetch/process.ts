import { Readability } from '@mozilla/readability';
import type { WebFetchResponse } from '@franklin/lib';
import {
	normalizeExtractedText,
	truncateText,
	decodeBody,
	toErrorMessage,
	normalizeContentType,
	startsWithAscii,
} from '../utils.js';
import type {
	WebFetchExtensionOptions,
	WebFetchProcessedResult,
} from './types.js';

const PDF_MAGIC = '%PDF-';

export function processWebResponse(
	response: WebFetchResponse,
	options: WebFetchExtensionOptions,
): WebFetchProcessedResult {
	if (response.status < 200 || response.status >= 300) {
		return {
			kind: 'http_error',
			content: `Request failed with HTTP status ${response.status} ${response.statusText}.`,
			isError: true,
			truncated: false,
		};
	}

	const contentType = response.headers['content-type'];
	const type = normalizeContentType(contentType);
	if (type === 'text/html' || type === 'application/xhtml+xml') {
		return extractHtml(response, options);
	}

	if (type === 'text/plain') {
		return extractPlainText(response, options);
	}

	if (type === 'application/pdf') {
		return {
			kind: 'pdf',
			content: 'PDF parsing is not implemented yet for fetch_url.',
			isError: true,
			truncated: false,
		};
	}

	if (startsWithAscii(response.body, PDF_MAGIC)) {
		return {
			kind: 'pdf',
			content: 'PDF parsing is not implemented yet for fetch_url.',
			isError: true,
			truncated: false,
		};
	}

	return {
		kind: 'error',
		content: `Unsupported content type: ${contentType ?? 'unknown'}.`,
		isError: true,
		truncated: false,
	};
}

function wrapUntrusted(body: string): string {
	return (
		`<<<<EXTERNAL_UNTRUSTED_CONTENT>>>>\n` +
		body +
		`\n<<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>>`
	);
}

function extractHtml(
	response: WebFetchResponse,
	options: WebFetchExtensionOptions,
): WebFetchProcessedResult {
	const html = decodeBody(response.body);
	const doc = new DOMParser().parseFromString(html, 'text/html');

	try {
		const article = new Readability(doc).parse();

		const title = normalizeExtractedText(article?.title ?? doc.title);
		const rawText = article?.textContent ?? doc.body.textContent;
		const normalized = normalizeExtractedText(rawText);

		const wrapped = wrapUntrusted(
			`TITLE: ${title !== '' ? title : '[empty title]'}\n` +
				(normalized !== '' ? normalized : '[empty body]'),
		);

		const { text, truncated } = truncateText(wrapped, options.maxOutputChars);
		return {
			kind: 'html',
			content: text,
			isError: false,
			truncated,
		};
	} catch (error) {
		return {
			kind: 'error',
			content: `Failed to extract HTML content: ${toErrorMessage(error)}`,
			isError: true,
			truncated: false,
		};
	}
}

function extractPlainText(
	response: WebFetchResponse,
	options: WebFetchExtensionOptions,
): WebFetchProcessedResult {
	const normalized = normalizeExtractedText(decodeBody(response.body));
	const { text, truncated } = truncateText(normalized, options.maxOutputChars);
	return {
		kind: 'text',
		content: text.length > 0 ? wrapUntrusted(text) : '[empty response]',
		isError: false,
		truncated,
	};
}
