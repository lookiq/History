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
  // VidIQ-style SEO: focus keyword in first 25 words, natural 2-4x density,
  // 3 hashtags (visible above title), specific->broad tag ladder.
  const fk = topic.focus_keyword || topic.title.replace(/#shorts/i, '').trim();
  const rel = topic.seo_keywords || [];
  const hts = topic.seo_hashtags || ['#history', '#shorts', '#thehistoryuncut'];
  const pillarWord = topic.pillar === 'hero' ? 'war heroes'
    : topic.pillar === 'bizarre' ? 'bizarre true stories' : 'daring deceptions';

  const k1 = rel[0] ? ` This is the untold true story of ${fk} — ${rel[0]} like you've never heard it.` : '';
  const k2 = rel[1] ? ` From ${rel[1]} to the shocking ending, this is ${pillarWord} history tried to forget.` : '';

  const description =
`${fk} — ${topic.hook}${k1}${k2}

${topic.question}

${CTA}

${hts.slice(0, 3).join(' ')}

Tags: ${fk.toLowerCase()}, ${rel.slice(0, 6).join(', ')}, history shorts, the history uncut, shocking history, untold history, ${pillarWord}, viral history, history facts`;

  return {
    title: topic.title,
    description,
    pinnedComment: `${topic.question} 👇`,
    focusKeyword: fk,
  };
}

module.exports = { buildScript, buildMetadata, CTA };
