/**
 * hu-v2 script builder — deterministic, no LLM API.
 * Assembles the proven History Uncut format (~60s, ~150 words):
 *   hook -> setup -> 3 beats -> payoff -> question -> subscribe CTA
 */
const CTA = 'Subscribe to The History Uncut for more unbelievable stories history almost forgot.';

function buildScript(topic) {
  const parts = [
    topic.hook,
    topic.setup,
    ...topic.beats,
    topic.payoff,
    topic.question,
    CTA,
  ];
  // Clean for TTS: no weird chars, numbers spelled out by voice engine naturally.
  const text = parts.join(' ');
  const words = text.split(/\s+/).length;
  return { title: topic.title, text, words, estSecs: Math.round((words / 145) * 60) };
}

function buildMetadata(topic, script) {
  const keywords = topic.title.replace('#shorts', '').trim();
  return {
    title: topic.title,
    description:
`${script.text.split('. ').slice(0, 2).join('. ')}.

${topic.question}

#history #shorts #thehistoryuncut #historyfacts

Tags: ${keywords}, history shorts, the history uncut, shocking history, untold history, war stories, viral history, history facts, documentary shorts`,
    pinnedComment: `${topic.question} 👇`,
  };
}

module.exports = { buildScript, buildMetadata, CTA };
