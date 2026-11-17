# Network rules

Franklin web policy and the Node sandbox use the same domain rules:

- `allowedDomains: []` denies destinations unless `allowPublicHosts` is explicitly true.
- `example.com` matches exactly; `*.example.com` matches strict subdomains, including nested ones. Use both entries for the root and its subdomains.
- `deniedDomains` wins over all allows and the public fallback. Its wildcards follow the same strict-subdomain rule. `*` and `*:port` are supported only in denies.
- An optional port restricts a rule to that destination port. A rule without a port covers all ports. HTTP/HTTPS use effective ports 80/443 even when the URL omits them.
- IPv6 entries must be bracketed: `[::1]` or `[::1]:8080`. Matching canonicalizes IPv6, numeric IPv4 shorthand, case and destination trailing dots.
- Empty patterns, URL paths/schemes, invalid ports, unbracketed IPv6 and overly broad allow wildcards such as `*` and `*.com` are rejected.

These rules follow Anthropic's [domain matcher](https://github.com/anthropics/sandbox-runtime/blob/main/src/sandbox/domain-pattern.ts) and [configuration schema](https://github.com/anthropics/sandbox-runtime/blob/main/src/sandbox/sandbox-config.ts), verified against the published `@anthropic-ai/sandbox-runtime@0.0.83` source. Franklin validates DNS label syntax more strictly than that version's permissive schema. It does not support IPv6 zone identifiers in rules.

## Explicit public access

```ts
const webPolicy = {
  allowedDomains: ['localhost:11434'],
  deniedDomains: ['blocked.example.com', '*.blocked.example.com'],
  allowPublicHosts: true,
};
```

`allowPublicHosts` is a Franklin fallback, implemented through SRT's supported permission callback for shell destinations. It permits public hostnames and public literals; loopback, private, link-local and IPv4-mapped private IPv6 literals still require explicit allows. Explicit native-style allow rules may name private services. The fallback is not unrestricted networking, and `['*']` is not a supported allow-all policy.

Public classification checks names/literals, not DNS resolution: DNS rebinding or a public name resolving to a private address is not prevented by this layer. The host sandbox may impose further restrictions.

New Obsidian, shared sidebar and SDK default environments opt into public access explicitly to preserve their web/search behavior. Test fixtures that never exercise network policy retain empty, closed lists; the redirect regression explicitly opts into public access so it actually reaches the loopback redirect guard.

## Persisted sessions

Session files now write version 4. Versions 1–3 migrate once at the codec boundary:

- Empty legacy allows become empty native allows plus `allowPublicHosts: true`.
- Host-only bare domains and `*.domain` become both root and strict-subdomain entries, in **both** allow and deny lists. Host:port entries stay exact.
- Legacy universal allow entries (`*` or empty string) become public fallback plus explicit loopback entries. Universal denies become `*`.
- Legacy unbracketed IPv6 becomes bracketed. Non-loopback private-literal allows, which the legacy web guard ignored, are removed rather than gaining access.
- Legacy `localhost` / `*.localhost` becomes exact `localhost`: native validation rejects the single-label wildcard, so arbitrary localhost subdomains must now be explicitly listed. A legacy deny of that tree also removes explicit allows underneath it to preserve deny precedence.
- Legacy wildcard-with-port entries never matched; they are removed rather than activated.
- Invalid/unrepresentable patterns fail schema validation rather than being silently discarded or granted public access. Original persisted files are not rewritten until the normal save path runs.

Port default matching, canonical IP forms and bracketed IPv6 now follow destination semantics. These intentionally fix legacy matching bugs. Programmatic configs are new native rules; they are never auto-detected as legacy. An SDK caller wanting its old public-open empty policy must opt into `allowPublicHosts`; one wanting root+subdomains must list both.

## Runtime boundary

This PR keeps sandbox-runtime **0.0.46**. That version has exact/strict-subdomain host matching but no port-aware native matcher. Franklin passes empty native lists and evaluates rules through its supported callback, so native host allows cannot skip a port deny. The first callback reads current validated permissions because that runtime retains it across repeated initialization. `NO_PROXY` is cleared inside shell commands so explicit loopback traffic reaches the policy proxy.

The runtime upgrade and sandbox manager/command lifecycle are separate parent-owned work. This wiring does not fix the existing process-global manager sharing or post-command reset lifecycle. Moving to 0.0.83 must retain callback fallback behavior and validate the host bundle before removing this compatibility path. Network tests cover policy decisions and manager callback retention; they do not establish end-to-end OS sandbox lifecycle correctness.
