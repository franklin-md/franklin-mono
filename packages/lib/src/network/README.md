# Network rules

Fetch and the Node sandbox share `networkAllowed(host, policy)`. Configuration is validated when a fetch wrapper or sandbox process is configured; the evaluator assumes validated rules.

- Empty `allowedDomains` denies access unless `allowPublicHosts` is true.
- `example.com` matches exactly; `*.example.com` matches strict subdomains. List both for root plus subdomains. Deny patterns use the same matching.
- `deniedDomains` wins over explicit allows and public fallback. `*` is supported only in denies.
- Allowed hosts cover **all ports**. Port-specific entries are rejected in both lists; granular port policy is deferred.
- IPv6 rules use brackets, such as `[::1]`. Host normalization handles IPv6, numeric IPv4 aliases, case and trailing dots. URL components, empty rules and broad wildcards such as `*.com` are rejected.

Exact/strict-subdomain matching and closed empty lists follow [Anthropic's domain rules](https://github.com/anthropics/sandbox-runtime/blob/v0.0.83/src/sandbox/domain-pattern.ts). Franklin deliberately supports only host rules, not upstream's newer port rules.

## Public access

```ts
const policy = {
  allowedDomains: ['localhost'],
  deniedDomains: ['blocked.example.com', '*.blocked.example.com'],
  allowPublicHosts: true,
};
```

`allowPublicHosts` explicitly enables the public fallback. Private/loopback names and literals need an explicit allow. It is implemented through the [supported sandbox callback](https://github.com/anthropics/sandbox-runtime#programmatic-usage); `['*']` is not a native allow-all policy. Obsidian, sidebar and SDK callers share `DEFAULT_NETWORK_CONFIG`, which enables public access and does not allow local services.

Known limitation: this checks hostnames and IP literals, not resolved addresses. An allowed DNS name can resolve to a private address; this layer does not prevent DNS rebinding.

## Saved sessions

Session version 4 migrates only the two known v1–v3 defaults: empty lists, or empty allows with the SDK's complete localhost debug-port deny list. Both become the public-access default. Custom legacy policies produce a restore issue requiring explicit reconfiguration; they are not silently translated or overwritten. New policies use the rules above, with no legacy interpretation.

## Runtime boundary

Sandbox-runtime stays at **0.0.46**. Empty native lists delegate decisions to the shared evaluator through its callback. `NO_PROXY` is cleared inside commands so loopback requests reach the proxy too.

That callback belongs to the process-global manager, not an individual command. Its getter can read updated policy but cannot isolate overlapping agents: the manager owner must drain commands before switching policies. Runtime upgrade, queuing and reset lifecycle remain separate parent-owned work. Tests of this adapter do not establish end-to-end OS sandbox lifecycle correctness.
