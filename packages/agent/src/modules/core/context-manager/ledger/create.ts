import type { SessionDraft } from '../draft/index.js';
import { ContextLedger } from './ledger.js';

type CreateContextLedgerInput = {
	readonly draft: SessionDraft;
};

export function createContextLedger(input: CreateContextLedgerInput) {
	return ContextLedger.create(input);
}
