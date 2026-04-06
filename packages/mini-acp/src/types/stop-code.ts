// ---------------------------------------------------------------------------
// StopCode — integer codes indicating why a turn ended.
//
// Ranges encode the category:
//   1xxx  finished   — the turn completed (normally or via cancellation)
//   2xxx  llm_error  — the turn could not complete
// ---------------------------------------------------------------------------

export enum StopCode {
	// 1xxx — finished
	Finished = 1000,
	Cancelled = 1001,

	// 2xxx — llm_error (generic)
	LlmError = 2000,

	// 21xx — config resolution
	ProviderNotSpecified = 2100,
	ProviderNotFound = 2101,
	ModelNotSpecified = 2102,
	ModelNotFound = 2103,
	AuthKeyNotSpecified = 2104,
	AuthKeyInvalid = 2105,

	// 22xx — provider runtime errors
	ProviderError = 2200,

	// 23xx — token limits
	MaxTokens = 2300,
}

// ---------------------------------------------------------------------------
// Valid codes (auto-derived from enum)
// ---------------------------------------------------------------------------

export const VALID_STOP_CODES: ReadonlySet<number> = new Set(
	Object.values(StopCode).filter((v): v is number => typeof v === 'number'),
);

// ---------------------------------------------------------------------------
// Derived category
// ---------------------------------------------------------------------------

export type StopCategory = 'finished' | 'llm_error';

export function stopCategory(code: StopCode): StopCategory {
	return (code as number) < 2000 ? 'finished' : 'llm_error';
}
