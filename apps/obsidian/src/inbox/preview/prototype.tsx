import { Check, CircleHelp, FileText } from 'lucide-react';
import { useRef, useState } from 'react';

import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { InboxContent } from '../ui/content.js';
import { previewModels } from './models.js';
import { selectedSource } from './source.js';
import { usePreview } from './use-preview.js';
import type { QuestionSource } from './types.js';
import '../ui/styles.css';
import '../ui/motion.css';
import './workspace.css';

type Props = { workspace?: boolean; empty?: boolean; width?: number };

export function InboxPrototype({
	workspace = false,
	empty = false,
	width = 720,
}: Props) {
	const container = useRef<HTMLDivElement>(null);
	const preview = usePreview(empty, container);
	const [captured, setCaptured] = useState(false);

	function addQuestion(text: string, source?: QuestionSource) {
		preview.add(text, undefined, source);
		const feed = container.current?.querySelector('.study-feed');
		feed?.scrollTo({ top: 0 });
	}

	return (
		<div
			className={`study-preview ${workspace ? 'study-workspace' : 'study-standalone'}`}
			ref={container}
			style={workspace ? undefined : { maxWidth: width }}
		>
			{workspace && (
				<aside className="study-note">
					<div className="study-note-tab">
						<FileText size={14} />
						<span>Sleep and wakeup</span>
						<span className="study-note-tab-dot" />
					</div>
					<div className="study-note-content">
						<div className="study-note-path">
							Systems <span>/</span> xv6 <span>/</span> Study notes
						</div>

						<h1>Sleep and wakeup</h1>
						<p className="study-note-intro">
							How does a process wait for something without missing the moment
							it happens?
						</p>
						<h2>Avoiding lost wakeups</h2>
						<p>
							A process checks a condition while holding a lock. If it cannot
							proceed, it sleeps on a channel, releasing the lock as part of
							going to sleep.
						</p>
						<div className="study-highlight">
							<mark>{selectedSource.quote}</mark>
						</div>
						<button
							type="button"
							className={`study-capture ${captured ? 'study-captured' : ''}`}
							onClick={() => {
								addQuestion(
									'Why check the condition again after waking up?',
									selectedSource,
								);
								setCaptured(true);
							}}
						>
							{captured ? <Check size={14} /> : <CircleHelp size={14} />}
							{captured ? 'Added to inbox' : 'Ask about selection'}
							<span>⌘ ⇧ I</span>
						</button>
						<p>
							The wakeup operation makes a matching process runnable. The
							scheduler still decides when it runs; the condition may have
							changed in between.
						</p>
						<div className="study-note-thought">
							<span>Still thinking about</span>
							<p>
								What, exactly, does the lock protect across this transition?
							</p>
						</div>
					</div>
					<div className="study-note-bottom">
						Linked to <span>Scheduling</span>
						<span>Locks</span>
						<span>Processes</span>
					</div>
				</aside>
			)}
			<InboxContent
				questions={preview.questions}
				models={previewModels}
				model={preview.model}
				answerInstructions={DEFAULT_ANSWER_INSTRUCTIONS}
				concurrency={preview.concurrency}
				setModel={preview.setModel}
				setConcurrency={preview.setConcurrency}
				onAdd={(text) => addQuestion(text)}
				onFollowUp={(text, id) => preview.add(text, id)}
				onDelete={preview.remove}
				onRetry={preview.retry}
				caption="Preview · Sample answers · Not saved"
			/>
		</div>
	);
}
