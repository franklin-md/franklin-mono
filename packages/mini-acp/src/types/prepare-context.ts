export type PrepareContextParams = {
	contextTokens: number;
	contextWindow: number;
	// The application must consume this update before preparing the next context.
	afterMessageId?: string;
};
