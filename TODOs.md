# TODOs — Deferred Work Including

## Packages

### agents:

- [ ] Checking for availability (is the packages installed, should we install them ourselves, and how do we cope with different versions)
- [ ] Not sure about authentication flow.

### libs:
- [ ] Not sure 'Streams' is right name for a primitive which is read and write streams.
- [ ] Can we define a Codec abstraction to support JSONL and other specific encoding of data sent across transport (vs hard coding?). For example, HttpCallbackServer really hard codes this.

## Packaging / Publishing

- [ ] Setup type declartion and exporting (especially for Browser Contexts)
- [ ] Before publishing any package to npm: evaluate whether to strip `sourceMap` / `inlineSources` from `tsconfig.base.json` (or override per package) to avoid shipping source content in dist artifacts

##
