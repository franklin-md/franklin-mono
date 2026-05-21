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
import { defineExtension, createExtensionPoint, compile } from '@franklin/extensibility';
import type { API, BaseRuntime, Extension, Signature, WithRuntime } from '@franklin/extensibility';
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

Configuration modules provide a CodeMirror Facet-style pattern: extensions
contribute typed inputs, the module compiler combines them, and runtime
consumers read the derived value through `config(configuration)`:

```ts
import { Configuration, createConfigurationModule } from '@franklin/extensibility/module';

const theme = new Configuration<string, string>({
	name: 'theme',
	combine: (values) => values.at(-1) ?? 'light',
});

const configurationModule = createConfigurationModule();
const darkThemeExtension = theme.of('dark');
```

The package intentionally does not expose wildcard subpaths. If a helper is not
available from one of the imports above, treat it as internal implementation
detail rather than a supported package API.
