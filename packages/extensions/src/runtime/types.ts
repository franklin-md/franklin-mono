export interface RuntimeBase<S> {
	state(): Promise<S>;
	fork(): Promise<S>;
	child(): Promise<S>;
	dispose(): Promise<void>;
	subscribe(listener: () => void): () => void;
}
