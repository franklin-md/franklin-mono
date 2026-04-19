export interface SystemPrompt {
	/**
	 * Set (or replace) this handler's fragment of the system prompt.
	 *
	 * Each handler owns a single fragment slot, identified by its
	 * registration. Calling `setPart` redefines that slot's contents;
	 * not calling it leaves the prior fragment untouched.
	 */
	setPart(content: string): void;
}
