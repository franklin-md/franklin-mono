import { createExtensionPoint } from '../create.js';
import type { StaticSignature } from '../../api/index.js';
import type { IdentitySignature } from '../../modules/simple/identity.js';

type CoreSignature = StaticSignature<{
	on(event: string, handler: () => void): void;
	registerTool(name: string): void;
}>;

type StoreSignature = StaticSignature<{
	registerStore(name: string, initial: unknown): void;
}>;

const hidden = Symbol('hidden');

type SymbolSignature = StaticSignature<{
	visible(value: string): void;
	[hidden](value: number): void;
}>;

createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

// @ts-expect-error core extension point must list every contribution key
createExtensionPoint<CoreSignature>({
	on: true,
});

createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
	// @ts-expect-error core extension point cannot list store keys
	registerStore: true,
});

createExtensionPoint<StoreSignature>({
	registerStore: true,
});

createExtensionPoint<SymbolSignature>({
	visible: true,
	[hidden]: true,
});

// @ts-expect-error symbol extension point must list the symbol contribution key
createExtensionPoint<SymbolSignature>({
	visible: true,
});

// @ts-expect-error store extension point must list registerStore
createExtensionPoint<StoreSignature>({});

createExtensionPoint<IdentitySignature>({});

createExtensionPoint<IdentitySignature>({
	// @ts-expect-error identity extension point has no contribution keys
	on: true,
});
