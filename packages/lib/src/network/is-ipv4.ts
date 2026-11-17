/** Tests the dotted-decimal form produced by normalizeHost. */
export function isIPv4(host: string): boolean {
	return /^\d+\.\d+\.\d+\.\d+$/.test(host);
}
