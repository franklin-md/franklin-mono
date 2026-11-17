# Anthropic runtime notes

Observed on 2026-11-17 against the installed `@anthropic-ai/sandbox-runtime@0.0.46`. These notes describe the macOS/Linux runtime and the shared command scheduler. Recheck these assumptions when upgrading the dependency.

## Scope and lifetime

`SandboxManager` is an exported object of functions over module-level state, not a constructor. Configuration, HTTP/SOCKS proxies, initialization state and Linux bridges are shared by callers of the same loaded module. This is not a machine-wide singleton, and it does not mean there is only one OS-sandboxed process.

| Object | Scope and lifetime |
| --- | --- |
| Franklin `SandboxedProcess` | Configuration holder and execution interface, reused by an environment; not an OS process. |
| Execution request | One command and its configuration snapshot, from submission through completion and cleanup. |
| Anthropic manager resources | Shared by the loaded module; created by `initialize()` and torn down by `reset()`. |
| Wrapped child process | One command with OS restrictions generated at wrapping time; descendants and connections must be accounted for before switching policy. |

Calling `initialize(otherConfig)` on an already initialized 0.0.46 manager reuses its initialization promise. It does not create an independent instance or install the other configuration. Creating another Franklin `SandboxedProcess` does not change this.

Source: [manager state, initialization and exported API][manager].

## What can vary per command?

For the narrow case of filesystem lists and network lists:

| Change | How it takes effect | Requires reset? |
| --- | --- | --- |
| Filesystem `allowRead`, `denyRead`, `allowWrite`, `denyWrite` | Pass the complete desired filesystem config to `wrapWithSandbox`; it generates that command's OS restrictions. | No. |
| Native network `allowedDomains`, `deniedDomains` | Shared proxy reads the manager's current lists; `updateConfig(fullConfig)` replaces them for subsequent policy decisions. | No, for a lists-only change with the same proxy setup and callbacks. |
| Proxy setup, such as `parentProxy` | Some values are captured when proxy servers start. | Reset and initialize to rebuild affected infrastructure. |
| Ask callback function supplied to `initialize` | Captured by the proxy's filter; `updateConfig` does not replace it. | Reinitialize to replace the function, or deliberately use a stable callback reading the current policy. |

`wrapWithSandbox(command, shell, customConfig)` does **not** install `customConfig.network.allowedDomains` as a per-command proxy allowlist. Initializing with empty native network lists and no callback keeps all destinations blocked, even when a wrapping config contains a nonempty list.

Filesystem overrides are per field: omitted fields fall back to manager configuration, while an explicit empty array overrides that field. Empty filesystem lists do not mean deny everything: reads follow deny-list semantics, and built-in writable paths remain. Existing processes do not gain a new filesystem profile when the manager configuration changes.

Therefore, different filesystem lists can coexist with the same shared network policy. Different network lists need a **coordinated policy switch**, not necessarily `reset()`. Calling `updateConfig` while an earlier command remains alive changes the policy used by that command's subsequent connections too. It is not a revocation mechanism for already established connections.

Sources: [wrapping, filtering and config updates][manager], [filesystem and network model][upstream-readme].

## Cleanup and the current Franklin implementation

`cleanupAfterCommand()` performs lightweight per-command cleanup (a no-op on macOS in 0.0.46). `reset()` stops shared proxy/bridge infrastructure; it is not cleanup scoped to one command. Resetting while another command uses the manager can break that command. Resetting between sequential commands requires initialization before the next command.

The [scheduler](./scheduler/index.ts) owns execution from submission through command cleanup. `SandboxedProcess.exec()` submits `{ input, config }` to `schedule()` and receives the command-result promise. Arguments, environment overrides, working directory and configuration are snapshotted before queueing. All process wrappers share the scheduler in [runtime.ts](./runtime.ts), matching SRT's module scope. That module supplies the scheduler's switch/reset dependencies; command execution calls [`execute(input, config)`](./execute.ts) directly with the queued snapshot.

### Queue and states

Every request enters an explicit queue, then `pump()` makes all currently possible progress. Arrival, command completion and switch completion trigger pumping; there are no admission timers or polling.

| State | Admission and transition |
| --- | --- |
| Idle | No commands running; retain the installed config. Start the oldest request if compatible, otherwise enter Switching. |
| Switching | No commands running; requests remain queued until initialization/update/restart finishes. Success returns to Idle and pumps. |
| Running | Admit compatible requests. Each active request retains ownership through execution and command cleanup. |
| Draining | Admit nothing; when the last active request finishes, return to Idle and immediately select the oldest queued request. |
| Failed | Configuration switching and recovery both failed. Reject queued and future requests; do not execute with uncertain sandbox state. |

A failed switch first attempts `reset()`. Successful recovery rejects that switch's initiating request and retries the remaining queue from an uninitialized Idle state. Execution failures, including command-cleanup errors, reject their own request and release its active slot.

### Compatibility and fairness

The four filesystem lists are per-command overrides and do not affect compatibility. Tasks require an explicit `allowRead` list, preventing fallback to an earlier command's manager-level list. `SandboxedProcess` already supplies it; the scheduler does not fill in missing configuration. Every other setting participates in structural comparison, including `filesystem.allowGitConfig`; list ordering is conservatively significant. No network rule semantics are changed here.

Admission follows queue order: compatible commands may overlap, but the oldest incompatible request immediately closes admission until active work drains. Later compatible requests cannot bypass it. This prevents queue bypassing, not unbounded execution time; a running command must still complete before the policy can switch.

TODO **franklin-c58** defers the `admissionWindowMs` optimization until measurements justify bounded bypassing. The scheduler stores no enqueue timestamps and uses no admission timers. A future cutoff can be checked on arrivals/completions without a timer merely to enforce admission.

When drained, native domain-list changes use `updateConfig`; other shared changes reset and initialize. Compatible idle commands reuse the warm manager. Per-command completion never resets it. The warm manager is owned by the loaded module, not by individual agents; no explicit host-unload/shutdown API is wired in this slice. Upstream registers process-exit cleanup.

### Deferred cancellation and lifetime limits

TODO **franklin-frc** tracks queued cancellation, scheduler deadlines and shutdown semantics. This scheduler has no cancellation API or queue deadline. Existing `ProcessInput.timeout` still starts at child spawning, excluding queue and setup time. Rejecting a caller promise must never be used as evidence that sandbox ownership has ended.

Execution waits for the child's `close` event even when an `error` event occurs first, then runs `cleanupAfterCommand()` before releasing its active slot. This covers the direct child and its stdio lifetime; it does **not** prove that detached descendants or their connections are gone. Full process-tree termination and connection draining remain unsupported. Avoid interpreting the scheduler as isolation for detached/background workloads.

Network semantics are owned by [PR #301][network-pr]. Its compatibility adapter keeps native lists empty and evaluates Franklin permissions through a callback. The native-list `updateConfig` path described above does not, by itself, update that callback's policy. Integration must bind a stable callback to the active policy, or recreate it when acquiring a new policy, without retaining an earlier agent's permissions. This note does not change that PR or choose the integration.

## Measured switching cost

Measured 2026-11-17 at 11:04 UTC on Apple M2 Pro arm64, macOS 15.7.4 (Darwin 24.6.0), Node 22.19.0, SRT 0.0.46. The benchmark imported the installed package directly as ESM, outside Obsidian and outside Franklin's coordinator. These are runtime-operation timings, not OS thread context-switch timings.

| Operation | Samples | Median (ms) | p95 (ms) | Min–max (ms) |
| --- | --: | --: | --: | --: |
| Fresh-process initialization | 20 | 8.391 | 8.846 | 8.061–9.367 |
| Warm reset + initialization | 30 | 2.255 | 2.521 | 2.096–2.667 |
| Reset alone | 30 | 0.0158 | 0.0273 | 0.0097–0.0413 |
| Initialization after reset | 30 | 2.163 | 2.391 | 1.867–2.403 |
| Warm native network-list `updateConfig()` | 30 | 0.0088 | 0.0167 | 0.0082–0.0603 |
| Wrap with alternating filesystem rules | 30 | 3.648 | 4.237 | 3.432–4.440 |
| Execute already-wrapped `printf ok` | 30 | 19.015 | 20.887 | 18.103–22.621 |

### Method and reproduction

- Five discarded warmups followed by 30 sequential samples for each warm operation. Fresh-process initialization used 20 independent Node processes with no warmups; its timer excluded process startup, module import and temporary-directory/configuration setup.
- Wall-clock timing used `performance.now()`. Median averages the middle two sorted samples; p95 uses nearest rank `ceil(0.95 * n)`. Reset and initialization measured separately used a different batch from the combined operation, so their medians need not add to the combined median.
- Filesystem configs had empty `allowRead`, one denied-read temporary directory, one allowed-write directory and one denied-write directory. Variants A/B swapped the allowed/denied write directories. Warm network updates kept the filesystem unchanged and alternated allowing `127.0.0.1` with denying it. Reset/reinitialization alternated complete A/B configurations.
- No ask callback, log monitor, active commands or proxy connections during switching measurements. Proxy environment variables (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` and lowercase equivalents) were cleared inside the benchmark process only. No external network requests or dependency installs.
- Execution used `/bin/sh -c <wrapped>` with a 3-second timeout. That row excludes wrapping and includes the per-command cleanup call, which is a no-op on this platform/version. The manager, local server and scratch directories were cleaned up after the run.

The operations measured were:

```js
await SandboxManager.initialize(config);
await SandboxManager.reset();
SandboxManager.updateConfig(nextConfig);
await SandboxManager.wrapWithSandbox('printf ok', undefined, perCommandConfig);
await execFile('/bin/sh', ['-c', wrapped], { timeout: 3000 });
```

The original script and raw samples were retained locally under `/tmp/franklin-srt-benchmark.OjHJfw/` as `benchmark.mjs` and `results.json`. While those temporary artifacts exist, reproduce with `node /tmp/franklin-srt-benchmark.OjHJfw/benchmark.mjs /absolute/path/to/this/worktree`. The table and method above are the durable record; temporary artifacts are not part of the package or a permanent benchmark suite.

### Behavior checked separately from timing

- A real macOS sandbox allowed a write to a temporary file under filesystem config A and denied the same write under B, with B supplied only to `wrapWithSandbox`; the manager configuration did not change.
- Host-side HTTP requests through the same local SRT proxy returned **200 → 403 → 200** as `updateConfig` changed native lists from allow to deny to allow. The proxy port stayed identical and no reset occurred. This checks live proxy policy updates, not independently scoped networking or the sandboxed child's route to the proxy.

### Interpretation and limits

For these small configs on an idle macOS runtime, warm reset/reinitialization cost about 2.3 ms, versus about 19 ms to execute a tiny already-wrapped command. Updating native lists was much cheaper and did not require reset. This supports considering a warm shared manager; it does not justify elaborate batching or reordering on performance grounds yet.

These measurements exclude waiting for running work to drain, persistent connections, detached descendants, large rulesets, Linux bridge teardown and PR #301's callback-based policy adapter. They do not establish Linux costs, Obsidian bundle compatibility, production tail latency or safe command termination. Re-measure when those conditions matter.

[manager]: https://github.com/anthropics/sandbox-runtime/blob/v0.0.46/src/sandbox/sandbox-manager.ts
[upstream-readme]: https://github.com/anthropics/sandbox-runtime/blob/v0.0.46/README.md
[network-pr]: https://github.com/franklin-md/franklin-mono/pull/301
