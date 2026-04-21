Agent: `Aquinas`

Investigate session lifecycle and history/compaction architecture across Pi and Franklin. Do not read `.context/attachments` or `.context/algebra`. Read Pi session-related and compaction-related source, plus Franklin's session system/runtime and relevant protocol tracking/context code. Answer: (1) should session lifecycle hooks live as registration on `SessionAPI` or elsewhere, (2) what minimal history primitives are actually needed, and (3) should compaction belong inside history or compose on top. Cite concrete files. Keep it under 900 words.

