import { createMounter } from '../../ui/mount.js';
import { ObsidianAppProvider } from '../../ui/obsidian-app-context.js';
import type { DirectiveRegistry } from '../registry.js';
import type { DirectiveReference } from '../syntax/types.js';
import { DirectiveComponent } from './component.js';

export function mountDirective(
	host: HTMLElement,
	registry: DirectiveRegistry,
	reference: DirectiveReference,
): () => void {
	const mounter = createMounter();
	mounter.mount(
		host,
		<ObsidianAppProvider value={registry.app}>
			<DirectiveComponent registry={registry} reference={reference} />
		</ObsidianAppProvider>,
	);
	return mounter.unmount;
}
