export const readFileDescription = `Used to read the contents of the specified file on the available filesystem.
This tool can only read files, not directories.`;

export const writeFileDescription = `Writes a file to the local filesystem.
This tool will overwrite the existing file if there is one at the provided path.
Prefer the Edit tool for modifying existing files, if the tool exists – it only sends the diff.
Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`;

export const editFileDescription = `Performs exact string replacements in files. 
The old_text must match exactly (including whitespace and newlines). 
Use this for precise, surgical edits. 
For new files or complete rewrites, use write_file instead. 
Set replace_all to true to replace every occurrence; otherwise the text must appear exactly once. 
This tool will return an error if you are trying to edit a file 
that has changed since the last time you have read it.`;

export const globDescription = `Fast file pattern matching tool that returns paths of files matching a glob pattern.
Use this to find files by name or extension (e.g. "**/*.ts", "src/**/*.test.js", "package.json").
Returns matching file paths as a list. 
Supports standard glob syntax: * (any characters in a segment), ** (any nested directories),
? (single character), {a,b} (alternatives), [abc] (character classes).
Use this tool when you need to discover files by name pattern — for searching file *contents*, use a different tool.`;

export const bashDescription = `
Purpose: Execute shell commands in an ephemeral bash session.
When to Use: Terminal operations: git, npm, docker, pytest, etc.
Commands that modify system state
Running builds, tests, servers

When NOT to Use:
File reading (use Read instead of cat/head/tail)
File editing (use Edit instead of sed/awk)
File writing (use Write instead of echo >)
File searching (use Glob instead of find/ls)
`;

export const webFetchDescription = `Fetch a public web page or text document over HTTP/HTTPS.
Use this when current knowledge is insufficient and you need the latest page contents.
Returns cleaned, truncated text from public pages. All content fetched will be capped at 1 GB.
This tool cannot log in, click, run JavaScript, use cookies, or access private browser sessions.
It may fail on client-rendered pages, protected sites, PDFs, or unsupported content types.`;

export const webSearchDescription = `Run a web search and return the top results as a list of links.
Use this when you need to discover relevant pages on the open web for a topic.
Results are returned as title + URL + snippet. This tool does NOT fetch the contents of the linked pages —
after picking a result, use fetch_url to retrieve the page body.
Keep queries concise and specific for better results.`;

export const spawnDescription = 'Spawn a new agent';

export const addTodoDescription = 'Add a new todo item';

export const completeTodoDescription = 'Mark a todo item as completed';

export const listTodosDescription = 'List all todo items';
