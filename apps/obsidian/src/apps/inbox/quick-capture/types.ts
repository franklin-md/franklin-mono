export type CaptureAction = 'quick-add' | 'thought-dump';

export type CaptureAnchor = {
	contextElement: HTMLElement;
	getBoundingClientRect: () => DOMRect;
};
