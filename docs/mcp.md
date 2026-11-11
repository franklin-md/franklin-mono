# Exa research and vault tables

Franklin can connect to Exa with an API key, use its search and research tools,
and save results as a native Markdown table. CSV is an optional companion export.

## Set up Exa

1. Open **Settings → Franklin → Connections → Add Exa**.
2. Enter your Exa API key and choose the allowed tools.
3. Save the connection, then select **Test connection**.
4. Enable **Research agent — uses Exa credits** if you want multi-step research.
   Search, fetching and advanced search are selected initially.

A successful test performs discovery only and launches no research. Because Exa
allows keyless discovery, “Connected · key configured” does not independently
verify the key. Credential/access errors are reported when the service rejects a
request. Obtain a key from [Exa's dashboard](https://dashboard.exa.ai/).

Keys are saved through Franklin's existing credential backend: Obsidian
SecretStorage when available, or the existing local `auth.json` fallback. Settings
store only generated credential references. Renaming a connection preserves its
identity. Changing the endpoint host clears the previous key binding and uses
fresh secret slots. Secret headers, including custom `Authorization` values,
are never included in model tool arguments.

**Add remote connection** supports other HTTPS Streamable HTTP tool servers with
static secret headers. Save, discover tools, select the ones you want, then save
again. Newly discovered tools start disabled. OAuth, local stdio processes and
MCP resources/prompts are not included.

## Ask for a table

> Find 20 UK ML infrastructure companies. Include company, website, location,
> what they build, hiring evidence and supporting sources. Save a Markdown table
> to Research/ML infrastructure companies.md and also export CSV.

The agent uses Exa, keeps supporting URLs and unknown values, and calls
`write_table`. Markdown is the default native Obsidian artifact. The note includes
the export time, requested columns, row sources and an explicit partial-results
label when supplied. The export time is not a source retrieval/publication date.
The final answer should link the note with a wikilink.

CSV uses the same columns and rows. The Markdown receipt includes a dataset hash;
the companion CSV call supplies that hash, so changed data fails before writing.
CSV quoting is deterministic. Formula-leading text and headers are protected for
spreadsheet use, with normalization reported in the receipt; typed numeric
negatives remain numbers. Multiple source URLs share a quoted cell separated by
line feeds. A CSV file is an export, not a built-in editable Obsidian grid.

`write_table` validates the whole input before writing, limits exports to 200 rows,
30 columns, 16 KiB per cell and 2 MiB per file, and reads back the completed file to
verify its bytes. It uses the same environment filesystem, permissions, Obsidian
indexing and seen-file bookkeeping as other file tools. Markdown writes participate
in the current accept/reject diff flow; CSV does not have equivalent Markdown
review. These are real writes, not delayed proposals awaiting a commit.

New exports refuse an existing destination. Read and inspect an existing file
before editing it with normal file tools or choosing another name. Markdown and
CSV are separate writes: if CSV fails, keep the Markdown and retry only the
unfinished export. If read-back verification fails after writing, inspect the
existing file before retrying. There is no multi-file transaction or cross-agent
exclusive-create guarantee, and later user edits do not synchronize between files.

## Chat and study Inbox

Chat has the selected remote tools plus local table-writing tools. Ordinary Inbox
questions receive only explicitly selected Exa search/fetch/advanced-search tools
and remain locally read-only. They do not automatically run paid research jobs.
A user-triggered Inbox action can research and export using its existing file
permissions; a saved action prompt can ask for a Markdown research table.

Configured Exa tools are preferred in chat and Inbox guidance. `search_web` then
uses DuckDuckGo as a separate backup. Disabling or failing a configured Exa
connection does not silently issue keyless Exa searches. With no configured Exa
preset, Franklin retains its existing default web-search behavior.

Connection additions and tool changes appear before the next turn in existing
chats. Disablement, deletion and credential rotation stop new calls through stale
tool definitions and retire the affected client. One unavailable server does not
prevent local chat. Streaming requests use current network permissions and reject
redirects.

When a research job returns a running ID, continue that same job rather than
submitting it again. A timed-out request can have an uncertain remote outcome;
Franklin does not automatically repeat it. Cancelling locally or unloading the
plugin does not guarantee that Exa has stopped paid remote work.

See [Exa's documented tools and auth](https://exa.ai/docs/get-started/exa-mcp),
[Obsidian tables](https://obsidian.md/help/Editing%2Band%2Bformatting/Advanced%2Bformatting%2Bsyntax),
and [Obsidian file formats](https://obsidian.md/help/Files%2Band%2Bfolders/Accepted%2Bfile%2Bformats).
