import type { ReactNode } from 'react';
import type { AnsweredQuestion } from '../types.js';

type Props = {
	answer: AnsweredQuestion;
	expanded: boolean;
	renderAnswer?: (text: string) => ReactNode;
};

export function QuestionAnswer({ answer, expanded, renderAnswer }: Props) {
	const render = renderAnswer ?? ((text: string) => <p>{text}</p>);
	return (
		<>
			<div
				className={`study-answer ${expanded || answer.details !== undefined ? 'study-answer-expanded' : ''}`}
			>
				{render(answer.answer)}
			</div>
			{!!answer.details?.length && (
				<div className="study-answer-details">
					{answer.details.map((detail, index) => (
						<details className="study-answer-detail" key={index}>
							<summary>{detail.title}</summary>
							<div className="study-answer study-answer-expanded study-answer-detail-content">
								{render(detail.content)}
							</div>
						</details>
					))}
				</div>
			)}
		</>
	);
}
