# @franklin/extensibility

Universal extension composition kernel for Franklin-style runtimes.

This package contains the runtime-generic algebra for extension points,
registries, compilers, runtimes, extension authoring, stateless modules,
stateful modules, and reusable composition patterns. It deliberately has no
runtime dependencies on agents, Mini-ACP, tools, stores, environments, or
built-in Franklin extensions.

Simple modules can also be created by lifting runtime factories; reusable
patterns such as dependency modules specialize that lift into named runtime
surfaces.
