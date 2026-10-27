import {
	decorate,
	assertAllowed,
	getHeader,
	normalizeUrl,
	withOnlyHTTP,
	withPolicy,
	withRedirect,
	withTimeout,
} from '@franklin/lib';
import type { WebFetchResponse } from '@franklin/lib';
import type {
	ConfigurationModule,
	ConfigurationRuntime,
} from '@franklin/extensibility/module';
import type { CoreModule } from '../../modules/core/index.js';
import type { EnvironmentModule } from '../../modules/environment/index.js';
import type {
	ReferenceHandler,
	ReferenceHandlerRuntime,
} from '../../modules/references/api/index.js';
import type { EnvironmentRuntime } from '../../modules/environment/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';
import { defineExtension } from '../../modules/state/index.js';
import { normalizeContentType } from '../web/utils.js';
import { detectFileType } from '../filesystem/common/supported.js';
import type { HTTPReferenceCache } from './cache.js';
import { documentDownloadPolicy } from './download-policy/configuration.js';

type Options = {
	maxBytes: number;
	maxRedirects: number;
	cache: HTTPReferenceCache;
};
type HTTPRuntime = ReferenceHandlerRuntime &
	EnvironmentRuntime &
	ConfigurationRuntime;

export function createHTTPReferenceExtension(options: Partial<Options> = {}) {
	// Download limits are independent of page limits: reading ten pages still
	// requires the source PDF bytes. Bound transfer time and memory before parsing.
	const { maxBytes = 64 * 1024 * 1024, maxRedirects = 5, cache } = options;
	const handler: ReferenceHandler<HTTPRuntime> = {
		test: (reference) =>
			reference.data === undefined && /^https?:/i.test(reference.locator),
		async toContext(reference, delegate, runtime) {
			// Snapshot once per read. A settings change affects the next download,
			// while an in-flight transfer retains the limits with which it started.
			const { idleTimeoutMs, totalTimeoutMs } = runtime.getConfig(
				documentDownloadPolicy,
			);
			const url = normalizeUrl(reference.locator);
			const permissions = structuredClone(
				(await runtime.environment.config()).netConfig,
			);
			assertAllowed(new URL(url), permissions);
			const fetch = decorate(runtime.environment.web.fetch)
				.with(withPolicy(permissions))
				.with(withOnlyHTTP())
				.with(withRedirect(maxRedirects))
				.with(withTimeout(totalTimeoutMs))
				.build();
			const load = async () => {
				const response = await fetch({
					url,
					method: 'GET',
					maxResponseBytes: maxBytes,
					idleTimeoutMs,
				});
				validateDocument(response, maxBytes);
				return response;
			};
			// Source identity excludes selectors and labels: all page ranges share bytes.
			// Partition by access policy and download limits so neither cached bytes nor
			// a concurrent loader can bypass another agent's redirect/permission checks.
			// Every redirect is also checked against the captured policy during download.
			const key = JSON.stringify([
				'http-reference-v2',
				url,
				[...permissions.allowedDomains].sort(),
				[...permissions.deniedDomains].sort(),
				maxBytes,
				maxRedirects,
				idleTimeoutMs,
				totalTimeoutMs,
			]);
			const response = cache ? await cache.getOrLoad(key, load) : await load();
			const mime = validateDocument(response, maxBytes);
			// HTTP resolves bytes; existing document handlers own parsing and selectors.
			// Keep the original locator across redirects so extracted pages cite their source.
			const context = await delegate({
				...reference,
				data: {
					type: 'bytes',
					bytes: response.body,
					...(mime ? { mime } : {}),
				},
			});
			if (context.content.type !== 'text') return context;
			return {
				...context,
				content: {
					type: 'text',
					text: `<<<<EXTERNAL_UNTRUSTED_CONTENT>>>>\n${context.content.text}\n<<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>>`,
				},
			};
		},
	};
	return defineExtension<
		[ReferencesModule, EnvironmentModule, CoreModule, ConfigurationModule]
	>((api) => {
		api.registerReferenceHandler(handler);
		api.on('systemPrompt', (prompt) => {
			prompt.setPart(
				'read_file supports public HTTP/HTTPS document URLs, including PDFs. For a remote PDF, pass its URL as path and select pages with selector "pages=N-M". Use fetch_url for HTML web pages.',
				{ once: true },
			);
		});
	});
}

function validateDocument(response: WebFetchResponse, maxBytes: number) {
	if (response.status < 200 || response.status >= 300)
		throw new Error(`HTTP ${response.status} ${response.statusText}`);
	if (response.body.byteLength > maxBytes)
		throw new Error(`Response exceeds ${maxBytes} bytes`);
	const mime =
		detectFileType(response.body)?.mime ??
		normalizeContentType(getHeader(response.headers, 'content-type'));
	if (mime === 'text/html' || mime === 'application/xhtml+xml')
		throw new Error(
			'This URL returned an HTML page. Use fetch_url to read web pages.',
		);
	return mime;
}
