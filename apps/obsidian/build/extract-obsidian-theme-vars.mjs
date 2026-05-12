import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/*
 * AI-generated Storybook support script.
 *
 * Purpose: derive a small, reviewable Obsidian host-theme variable snapshot
 * from a locally extracted Obsidian `app.css`. Storybook commits that derived
 * snapshot instead of requiring every developer to have Obsidian installed or
 * to extract `obsidian.asar` during startup.
 *
 * This intentionally does not copy Obsidian's full stylesheet. It keeps only
 * custom property declarations from the global desktop default-theme selectors
 * that Franklin components may read through Obsidian's documented CSS variable
 * contract.
 */

const DEFAULT_OUTPUT = resolve(
	import.meta.dirname,
	'../.storybook/obsidian-default-theme-vars.css',
);

const RULE_KEY_SEPARATOR = '\u001f';

const GLOBAL_THEME_SELECTORS = new Set([
	':root',
	'body',
	'.theme-light, .theme-dark',
	'.theme-light',
	'.theme-dark',
	'.mod-macos',
]);

const CUSTOM_PROPERTY = /^--[A-Za-z0-9_-]+$/;

const args = parseArgs(process.argv.slice(2));
if (!args.input) {
	printUsage();
	process.exit(1);
}

const input = resolve(args.input);
const output = args.output ? resolve(args.output) : DEFAULT_OUTPUT;
const source = readFileSync(input, 'utf8');
const snapshot = createSnapshot(source, args.version);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, snapshot);

console.log(`Extracted Obsidian theme variables to ${output}`);

/** Builds the final snapshot text from raw Obsidian CSS. */
function createSnapshot(source, version = 'unknown') {
	const rules = new Map();
	walkBlocks(source, 0, source.length, [], rules);

	const lines = [
		'/*',
		` * Generated from Obsidian Desktop ${version} app.css.`,
		' * Contains custom properties from global default theme selectors only.',
		' * Regenerate with:',
		' *   npm run extract-obsidian-theme-vars -w @franklin/obsidian -- /path/to/app.css --version=<obsidian-version>',
		' */',
		'',
	];

	for (const rule of rules.values()) {
		if (rule.declarations.size === 0) continue;
		appendRule(lines, rule);
		lines.push('');
	}

	return `${lines.join('\n').trimEnd()}\n`;
}

/** Emits one CSS rule, preserving wrapper order for @media/@supports blocks. */
function appendRule(lines, rule) {
	let indent = '';

	for (const wrapper of rule.wrappers) {
		lines.push(`${indent}${wrapper} {`);
		indent += '\t';
	}

	lines.push(`${indent}${rule.selector} {`);
	for (const [property, value] of rule.declarations) {
		lines.push(`${indent}\t${property}: ${value};`);
	}
	lines.push(`${indent}}`);

	for (let i = rule.wrappers.length - 1; i >= 0; i -= 1) {
		indent = indent.slice(1);
		lines.push(`${indent}}`);
	}
}

/** Recursively scans CSS blocks and collects allowed selector declarations. */
function walkBlocks(source, start, end, wrappers, rules) {
	let index = start;

	while (index < end) {
		index = skipWhitespaceAndComments(source, index, end);
		const headerStart = index;
		const open = findNextOpeningBrace(source, index, end);
		if (open === -1) return;

		const header = source.slice(headerStart, open).trim();
		const close = findMatchingClosingBrace(source, open, end);
		if (close === -1) {
			throw new Error(`Unclosed CSS block: ${header}`);
		}

		if (header.startsWith('@')) {
			walkBlocks(source, open + 1, close, [...wrappers, header], rules);
		} else {
			const selector = normalizeSelector(header);
			if (GLOBAL_THEME_SELECTORS.has(selector)) {
				addRule(
					rules,
					selector,
					wrappers,
					extractCustomProperties(source.slice(open + 1, close)),
				);
			}
		}

		index = close + 1;
	}
}

/** Merges repeated selector blocks while keeping later declarations authoritative. */
function addRule(rules, selector, wrappers, declarations) {
	if (declarations.length === 0) return;

	const key = createRuleKey(wrappers, selector);
	let rule = rules.get(key);
	if (!rule) {
		rule = {
			selector,
			wrappers,
			declarations: new Map(),
		};
		rules.set(key, rule);
	}

	for (const declaration of declarations) {
		rule.declarations.set(declaration.property, declaration.value);
	}
}

/** Creates a stable map key for a selector plus its wrapper context. */
function createRuleKey(wrappers, selector) {
	return [...wrappers, selector].join(RULE_KEY_SEPARATOR);
}

/** Extracts top-level CSS custom property declarations from a rule body. */
function extractCustomProperties(block) {
	const declarations = [];
	let start = 0;
	let depth = 0;
	let index = 0;

	while (index < block.length) {
		const next = skipCommentOrString(block, index, block.length);
		if (next !== index) {
			index = next;
			continue;
		}

		const char = block[index];
		if (char === '(') depth += 1;
		if (char === ')') depth = Math.max(0, depth - 1);

		if (char === ';' && depth === 0) {
			pushCustomProperty(declarations, block.slice(start, index));
			start = index + 1;
		}

		index += 1;
	}

	pushCustomProperty(declarations, block.slice(start));
	return declarations;
}

/** Appends a custom property declaration when the raw declaration is supported. */
function pushCustomProperty(declarations, rawDeclaration) {
	const declaration = rawDeclaration.replaceAll(/\/\*[\s\S]*?\*\//g, '').trim();
	if (!declaration.startsWith('--')) return;

	const colon = declaration.indexOf(':');
	if (colon === -1) return;

	const property = declaration.slice(0, colon).trim();
	if (!CUSTOM_PROPERTY.test(property)) return;

	const value = declaration.slice(colon + 1).trim();
	declarations.push({ property, value });
}

/** Normalizes selectors so wrapped multiline selectors can match the allowlist. */
function normalizeSelector(selector) {
	return selector
		.split(',')
		.map((part) => part.trim().replace(/\s+/g, ' '))
		.join(', ');
}

/** Finds the next block opener while ignoring braces inside comments/strings. */
function findNextOpeningBrace(source, start, end) {
	let index = start;
	while (index < end) {
		const next = skipCommentOrString(source, index, end);
		if (next !== index) {
			index = next;
			continue;
		}

		if (source[index] === '{') return index;
		index += 1;
	}
	return -1;
}

/** Finds the closing brace matching an already-known opening brace. */
function findMatchingClosingBrace(source, open, end) {
	let depth = 1;
	let index = open + 1;

	while (index < end) {
		const next = skipCommentOrString(source, index, end);
		if (next !== index) {
			index = next;
			continue;
		}

		const char = source[index];
		if (char === '{') depth += 1;
		if (char === '}') depth -= 1;
		if (depth === 0) return index;
		index += 1;
	}

	return -1;
}

/** Moves the scanner to the next meaningful token. */
function skipWhitespaceAndComments(source, start, end) {
	let index = start;
	while (index < end) {
		if (/\s/.test(source[index])) {
			index += 1;
			continue;
		}

		if (source[index] === '/' && source[index + 1] === '*') {
			index = skipComment(source, index, end);
			continue;
		}

		return index;
	}
	return index;
}

/** Skips comments and quoted strings so nested syntax does not confuse scanning. */
function skipCommentOrString(source, start, end) {
	if (source[start] === '/' && source[start + 1] === '*') {
		return skipComment(source, start, end);
	}

	if (source[start] === '"' || source[start] === "'") {
		return skipString(source, start, end, source[start]);
	}

	return start;
}

/** Skips a CSS block comment. */
function skipComment(source, start, end) {
	const close = source.indexOf('*/', start + 2);
	return close === -1 ? end : close + 2;
}

/** Skips a quoted CSS string, including escaped characters. */
function skipString(source, start, end, quote) {
	let index = start + 1;
	while (index < end) {
		if (source[index] === '\\') {
			index += 2;
			continue;
		}
		if (source[index] === quote) return index + 1;
		index += 1;
	}
	return end;
}

/** Parses positional input/output paths plus the provenance version flag. */
function parseArgs(values) {
	const parsed = {
		input: undefined,
		output: undefined,
		version: undefined,
	};

	for (const value of values) {
		if (value.startsWith('--version=')) {
			parsed.version = value.slice('--version='.length);
			continue;
		}

		if (!parsed.input) {
			parsed.input = value;
			continue;
		}

		if (!parsed.output) {
			parsed.output = value;
			continue;
		}

		throw new Error(`Unexpected argument: ${value}`);
	}

	return parsed;
}

/** Prints CLI usage when the required source app.css path is missing. */
function printUsage() {
	console.error(
		'Usage: node ./build/extract-obsidian-theme-vars.mjs <app.css> [output.css] [--version=<obsidian-version>]',
	);
}
