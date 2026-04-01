export const readFileDescription =
	'Used to read the contents of the specified file on the available filesystem.' +
	'This tool can only read files, not directories. ';

export const writeFileDescription =
	'Writes a file to the local filesystem.' +
	'This tool will overwrite the existing file if there is one at the provided path.' +
	'Prefer the Edit tool for modifying existing files, if the tool exists – it only sends the diff.' +
	'Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.';

export const editFileDescription =
	'Performs exact string replacements in files. ' +
	'The old_text must match exactly (including whitespace and newlines). ' +
	'Use this for precise, surgical edits. ' +
	'For new files or complete rewrites, use write_file instead. ' +
	'Set replace_all to true to replace every occurrence; otherwise the text must appear exactly once. ' +
	'This tool will return an error if you are trying to edit a file ' +
	'that has changed since the last time you have read it.';

export const globDescription =
	'Fast file pattern matching tool that returns paths of files matching a glob pattern. ' +
	'Use this to find files by name or extension (e.g. "**/*.ts", "src/**/*.test.js", "package.json"). ' +
	'Returns matching file paths as a list. ' +
	'Supports standard glob syntax: * (any characters in a segment), ** (any nested directories), ' +
	'? (single character), {a,b} (alternatives), [abc] (character classes). ' +
	'Use this tool when you need to discover files by name pattern — for searching file *contents*, use a different tool.';

export const spawnDescription = 'Spawn a new agent';

export const addTodoDescription = 'Add a new todo item';

export const completeTodoDescription = 'Mark a todo item as completed';

export const listTodosDescription = 'List all todo items';
