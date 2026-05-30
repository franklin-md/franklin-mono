import { createBundle } from '../../modules/bundle/create.js';
import { viewingContextExtension as buildViewingContextExtension } from './extension.js';
import { viewingContextKey } from './key.js';

export const viewingContextExtension = createBundle({
	extension: buildViewingContextExtension(),
	keys: { viewingContext: viewingContextKey },
	tools: {},
});
