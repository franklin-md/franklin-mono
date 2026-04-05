import type { StopReason as PiStopReason } from '@mariozechner/pi-ai';

import { StopCode } from '../../../types/stop-code.js';

export function narrowPiStopCode(
	reason: PiStopReason,
	errorMessage?: string,
): StopCode | null {
	switch (reason) {
		case 'stop':
			return StopCode.Finished;
		case 'length':
			return StopCode.MaxTokens;
		case 'error':
			return narrowPiErrorStopCode(errorMessage);
		case 'aborted':
			return StopCode.Cancelled;
		case 'toolUse':
			return null;
	}
}

export function fromPiStopReason(reason: PiStopReason): StopCode | null {
	return narrowPiStopCode(reason);
}

function narrowPiErrorStopCode(errorMessage?: string): StopCode {
	const message = errorMessage ?? '';
	const lower = message.toLowerCase();
	const status = extractHttpStatus(message);

	if (
		status === 401 ||
		lower.includes('incorrect api key') ||
		lower.includes('invalid api key') ||
		lower.includes('invalid_api_key') ||
		lower.includes('unauthorized') ||
		lower.includes('authentication')
	) {
		return StopCode.AuthKeyInvalid;
	}

	if (
		lower.includes('no api key for provider') ||
		lower.includes('api key is required') ||
		lower.includes('missing api key') ||
		lower.includes('missing auth key')
	) {
		return StopCode.AuthKeyNotSpecified;
	}

	if (status !== undefined) {
		return StopCode.ProviderError;
	}

	return StopCode.LlmError;
}

function extractHttpStatus(message: string): number | undefined {
	const prefixedMatch = /^\s*(\d{3})\b/.exec(message);
	if (prefixedMatch) {
		return Number(prefixedMatch[1]);
	}

	const labelledMatch = /\bstatus(?:=|:|\s)\s*(\d{3})\b/i.exec(message);
	if (labelledMatch) {
		return Number(labelledMatch[1]);
	}

	return undefined;
}
