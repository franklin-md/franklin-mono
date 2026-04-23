export type RedirectResponse = {
	status: number;
	headers: Record<string, string>;
	body: string;
};

export type SuccessOutcome = {
	kind: 'success';
	code: string;
	response: RedirectResponse;
};

export type ErrorOutcome = {
	kind: 'error';
	error: Error;
	response: RedirectResponse;
};

export type IgnoredOutcome = {
	kind: 'ignore';
	response: RedirectResponse;
};

export type CallbackOutcome = SuccessOutcome | ErrorOutcome | IgnoredOutcome;
