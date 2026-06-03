# `@franklin/extension-pdf`

Optional PDF extensions for Franklin.

This package owns PDF-specific dependencies such as `unpdf` and the Mistral
client so applications that only need the core agent runtime do not inherit PDF
processing requirements.

The package exports two extension families:

- `createPDFDocumentReferenceExtension` registers a PDF reference materializer.
  It is used by reference-backed readers such as `read_file` after another
  reference handler has resolved a PDF locator into bytes.
- `createReadPDFToolExtension` registers the standalone `read_pdf` tool. Hosts
  should only install this when they want the model to see a separate PDF tool
  instead of using reference-backed file reads.

## Usage

```ts
import {
	createPDFDocumentReferenceExtension,
	createReadPDFToolExtension,
} from '@franklin/extension-pdf';
```

Applications provide a screenshot renderer because rendering PDF pages depends
on the host runtime.
