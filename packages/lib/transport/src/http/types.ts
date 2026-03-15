export type SuccessResponse = {
	id: string;
	result: unknown;
};

export type ErrorResponse = {
	id: string;
	error: string;
};

export type Response = SuccessResponse | ErrorResponse;
