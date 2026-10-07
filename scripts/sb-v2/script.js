/**
 * sb-v2 script builder — deterministic, no LLM API.
 * Assembles the SciBytes format (~50-55s, ~125-140 words):
 *   hook -> setup -> 3 beats -> payoff -> question -> subscribe CTA
 * Mirrors hu-v2/script.js structure, SciBytes wording/metadata.
 */
const path = require('path');

function loadBank() {
  return require('./topics.json');
}

const CTA = loadBank().cta || 'Subscribe to SciBytes — see you in the cosmos!';

function buildScript(topic) {
  const parts = [
    topic.hook,
    topic.setup,
    ...topic.beats,
    topic.payoff,
    topic.question,
    CTA,
  ];
  const text = parts.join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return { title: topic.title, text, words, estSecs: Math.round((words / 150) * 60) };
}

function buildMetadata(topic) {
  // Locked 2026-10-07 delivery format: description = body + hashtags ONLY
  // (tags go in the separate tags block, for YouTube's tags field).
  const fk = topic.focus_keyword || topic.title.replace(/#shorts/i, '').trim();
  const rel = topic.seo_keywords || [];
  const hts = topic.seo_hashtags || ['#spacefacts', '#shorts', '#scibytes'];
  const pillarWord = topic.pillar === 'mystery' ? 'mind-bending space facts'
    : topic.pillar === 'origins' ? 'cosmic origins' : 'epic space stories';

  const body =
`${topic.hook} ${topic.setup}

${topic.beats.join(' ')}

${topic.payoff} ${topic.question}

${hts.join(' ')}`;

  const tags = [fk.toLowerCase(), ...rel.slice(0, 6).map(s => s.toLowerCase()),
    'space facts', 'scibytes', 'shorts', pillarWord].filter(Boolean).join(', ');

  return {
    title: topic.title,
    description: body,
    tags,
    pinnedComment: `${topic.question} 👇🚀`,
    focusKeyword: fk,
  };
}

module.exports = { buildScript, buildMetadata, CTA, loadBank };
