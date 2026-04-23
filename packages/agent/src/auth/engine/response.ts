import type { RedirectResponse } from './types.js';

export function htmlResponse(
	status: number,
	message: string,
): RedirectResponse {
	return {
		status,
		headers: { 'Content-Type': 'text/html; charset=utf-8' },
		body: `<!doctype html><html><body style="font-family:system-ui;padding:2rem"><p>${escapeHtml(message)}</p></body></html>`,
	};
}

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
