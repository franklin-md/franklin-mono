import { useSyncExternalStore } from 'react';
import type { DirectiveRegistry } from '../registry.js';
import { formatDirective } from '../syntax/format.js';
import type { DirectiveReference } from '../syntax/types.js';
import { DirectiveBoundary } from './boundary.js';

type Props = { registry: DirectiveRegistry; reference: DirectiveReference };

export function DirectiveComponent({ registry, reference }: Props) {
	const Renderer = useSyncExternalStore(registry.subscribe, () =>
		registry.getRenderer(reference.name, reference.id),
	);
	const text = formatDirective(reference.name, reference.id);
	return Renderer ? (
		<DirectiveBoundary key={reference.id} fallback={text}>
			<Renderer id={reference.id} />
		</DirectiveBoundary>
	) : (
		text
	);
}
