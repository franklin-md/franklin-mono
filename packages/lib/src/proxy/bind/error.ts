export class UnsupportedDescriptorError extends Error {
	constructor(kind: string) {
		super(`Runtime does not support "${kind}" descriptors`);
		this.name = 'UnsupportedDescriptorError';
	}
}
