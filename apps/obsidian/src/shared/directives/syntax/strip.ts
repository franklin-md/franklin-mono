import { parseDirectives } from './parse.js';

export function stripDirectives(source: string): string {
	for (const token of parseDirectives(source).reverse())
		source = source.slice(0, token.from) + source.slice(token.to);
	return source;
}
