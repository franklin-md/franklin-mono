# @franklin/extensibility

Universal extension composition kernel for Franklin-style runtimes.

This package contains the runtime-generic algebra for extension points,
registries, compilers, runtimes, extension authoring, stateless modules,
and reusable composition patterns. It deliberately has no runtime dependencies
on agents, Mini-ACP, tools, stores, environments, or built-in Franklin
extensions.

## Public imports

Use the root package for extension authoring, extension-point registration,
compiler/runtime primitives, and runtime lifecycle types:

```ts
import { defineExtension, createExtensionPoint, compile, priority } from '@franklin/extensibility';
import type { API, BaseRuntime, Extension, Signature, WithRuntime } from '@franklin/extensibility';
```

Use `priority` to derive a same-shape API facade whose registrations land in
one of the `highest`, `high`, `default`, `low`, or `lowest` ordering buckets
when read through `RegistryView`:

```ts
priority.highest(api).registerSystemPrompt(handler);
priority.high(api).on('prompt', handler);
priority.low(api).registerTool(tool);
```

Use `@franklin/extensibility/authoring` when a package wants the
module-aware authoring helper without importing the rest of the root barrel:

```ts
import { defineExtension } from '@franklin/extensibility/authoring';
import type { ExtensionForModules } from '@franklin/extensibility/authoring';
```

Use `@franklin/extensibility/module` for stateless module algebra and module
composition helpers. Simple modules can also be created by lifting runtime
factories; reusable patterns such as dependency modules specialize that lift
into named runtime surfaces:

```ts
import { combineAll, createDependencyModule, liftRuntimeFactory } from '@franklin/extensibility/module';
import type { ExtensionModule, InferRuntime, RuntimeModule } from '@franklin/extensibility/module';
```

Configuration modules provide a CodeMirror Facet-style pattern: configuration
providers contribute typed input values, the module compiler combines those
values with the provider's configuration, and runtime consumers read the derived
value through `getConfig(configurationProvider)`. Configurations default their
output type to their input type; use a second type argument when a configuration
combines inputs into a different output shape:

```ts
import { ConfigurationProvider, createConfigurationModule } from '@franklin/extensibility/module';

const account = new ConfigurationProvider<'free' | 'premium'>({
	name: 'account',
	combine: (values) => values.at(-1) ?? 'free',
});

const maxPdfPages = new ConfigurationProvider<number>({
	name: 'maxPdfPages',
	combine: (values) => values.at(-1) ?? 10,
});

const promptPrefix = new ConfigurationProvider<string, string>({
	name: 'promptPrefix',
	combine: (values) => values.join('\n'),
});

const configurationModule = createConfigurationModule();
const premiumAccountExtension = account.of('premium');
const computedLimitExtension = maxPdfPages.compute([account], ({ getConfig }) =>
	getConfig(account) === 'premium' ? 100 : 10,
);
```

The package intentionally does not expose wildcard subpaths. If a helper is not
available from one of the imports above, treat it as internal implementation
detail rather than a supported package API.
