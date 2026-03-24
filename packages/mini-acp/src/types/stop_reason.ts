
// Value	        | Meaning
// ---------------------------------------------
// end_turn	        | Normal completion
// max_tokens   	| maximum token limit reached
// refusal	        | LLM or provider error
// cancelled	    | Client cancelled the turn

export type StopReason = "end_turn" | "max_tokens" | "refusal" | "cancelled";

