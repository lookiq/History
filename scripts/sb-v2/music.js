/**
 * sb-v2 music + playlist picks — YouTube Audio Library suggestions.
 * Nothing is baked into the video; Md adds the track at upload time.
 * Space-cinematic lane (differs from hu-v2's historical pillars).
 */
const MUSIC_BANK = {
  mystery: [
    'Interloper — Kevin MacLeod',
    'Darkest Child — Kevin MacLeod',
    'Oppressive Gloom — Kevin MacLeod',
  ],
  origins: [
    'Despair and Triumph — Kevin MacLeod',
    'Eternal Hope — Kevin MacLeod',
    'The Journey Home — Kevin MacLeod',
  ],
  epic: [
    'Heroic Age — Kevin MacLeod',
    'Five Armies — Kevin MacLeod',
    'Black Vortex — Kevin MacLeod',
  ],
};

const PLAYLISTS = {
  mystery: 'Mind-Bending Space',
  origins: 'Cosmic Origins',
  epic: 'Epic Space Stories',
};

/** Rotate tracks so consecutive videos don't suggest the same music. */
function pickMusic(pillar, salt = 0) {
  const tracks = MUSIC_BANK[pillar] || MUSIC_BANK.epic;
  return tracks[salt % tracks.length];
}

function playlistFor() {
  return 'NASA Missions';
}

module.exports = { pickMusic, playlistFor, MUSIC_BANK, PLAYLISTS };
