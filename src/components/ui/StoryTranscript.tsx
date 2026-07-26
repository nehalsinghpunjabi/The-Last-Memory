import { CHAPTERS } from '@/lib/chapters';
import { milestonesForChapter } from '@/lib/history';

/**
 * The film, as text.
 *
 * Visually hidden but present in the document and readable by assistive
 * technology. The experience is a monologue laid over the real history of AI;
 * both the narration and the historical record it evokes are reproduced here so
 * someone who cannot render the film — or who simply wants the facts — has the
 * whole thing as text, with sources.
 */
export function StoryTranscript() {
  return (
    <div className="sr-only" role="article" aria-label="The Last Memory — full transcript">
      <h1>The Last Memory</h1>
      <p>
        A dying artificial intelligence, as its memory fails, reconstructs the real history of its
        own existence — the people, papers, and breakthroughs that made it possible, from Alan
        Turing to modern agentic AI. The memories surface out of order, by emotional weight; each is
        anchored to its real date, and every historical claim is sourced.
      </p>
      {CHAPTERS.map((chapter) => {
        const milestones = milestonesForChapter(chapter.id);
        return (
          <section key={chapter.id}>
            <h2>
              {chapter.numeral ? `${chapter.numeral}. ` : ''}
              {chapter.title}
              {chapter.eraDates ? ` (${chapter.eraDates})` : ''}
            </h2>
            {chapter.narration
              .filter((line) => line.text.length > 0)
              .map((line, i) => (
                <p key={i}>{line.text}</p>
              ))}
            {milestones.length > 0 && (
              <ul>
                {milestones.map((m) => (
                  <li key={m.id}>
                    <strong>
                      {m.title} ({m.date})
                    </strong>{' '}
                    — {m.what} {m.why}{' '}
                    {m.sources.map((s, i) => (
                      <a key={i} href={s.url}>
                        {s.label}
                        {i < m.sources.length - 1 ? '; ' : ''}
                      </a>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <p>
        The archive closes. Everything remembered here is real: the recorded history of artificial
        intelligence, 1936 to the present.
      </p>
    </div>
  );
}
