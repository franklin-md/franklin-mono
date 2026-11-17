# Network rules

Fetch and the Node sandbox share `networkAllowed(host, policy)`. Configuration is validated when a fetch wrapper or sandbox process is configured; the evaluator assumes validated rules.

- Empty `allowedDomains` denies access.
- `*` matches every host, including public, private and loopback destinations. It is supported in both allow and deny lists; denies always win.
- `example.com` matches exactly; `*.example.com` matches strict subdomains. List both for root plus subdomains. Deny patterns use the same matching.
- Allowed hosts cover **all ports**. Port-specific entries are rejected in both lists; granular port policy is deferred.
- IPv6 rules use brackets, such as `[::1]`. Host normalization handles IPv6, numeric IPv4 aliases, case and trailing dots. URL components, empty rules and broad subdomain wildcards such as `*.com` are rejected.

Exact/strict-subdomain matching and closed empty lists follow [Anthropic's domain rules](https://github.com/anthropics/sandbox-runtime/blob/v0.0.83/src/sandbox/domain-pattern.ts). Allowing `*` is a Franklin extension, enforced through the [supported sandbox callback](https://github.com/anthropics/sandbox-runtime#programmatic-usage). Franklin never passes its allow/deny lists directly to SRT; a native SRT allowlist still rejects `*`.

## Default access

```ts
const policy = {
  allowedDomains: ['*'],
  deniedDomains: ['blocked.example.com', '*.blocked.example.com'],
};
```

Obsidian, sidebar and SDK callers share `DEFAULT_NETWORK_CONFIG`: allow `*`, deny nothing. This intentionally permits public internet and local/private services. Filesystem policy remains separate. Selectors for public/private groups (for example `*.public` / `*.private`) are deferred under `franklin-12n`; they are not supported rules today.

Known limitation: this checks hostnames and IP literals, not resolved addresses. An allowed DNS name can resolve to a denied IP address; this layer does not prevent DNS rebinding.

## Saved sessions

Session version 4 migrates only the two known v1–v3 defaults: empty lists, or empty allows with the SDK's complete localhost debug-port deny list. Both adopt the new unrestricted network default, including private access. Custom legacy policies produce a restore issue requiring explicit reconfiguration; they are not silently translated or overwritten. New policies use the rules above, with no legacy interpretation.

## Runtime boundary

Sandbox-runtime stays at **0.0.46**. Empty native lists delegate decisions to the shared evaluator through its callback. `NO_PROXY` is cleared inside commands so loopback requests reach the proxy too.

That callback belongs to the process-global manager, not an individual command. Its getter can read updated policy but cannot isolate overlapping agents: the manager owner must drain commands before switching policies. Runtime upgrade, queuing and reset lifecycle remain separate parent-owned work. Tests of this adapter do not establish end-to-end OS sandbox lifecycle correctness.
