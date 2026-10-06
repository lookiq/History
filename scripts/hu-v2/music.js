/**
 * hu-v2 music + playlist picks — YouTube Audio Library suggestions per pillar.
 * Nothing is baked into the video; Md adds the track at upload time from his phone.
 * All tracks below are well-known YouTube Audio Library entries (Kevin MacLeod).
 */

const MUSIC_BANK = {
  hero: [
    'Heroic Age — Kevin MacLeod',
    'Five Armies — Kevin MacLeod',
    'Black Vortex — Kevin MacLeod',
  ],
  bizarre: [
    'Sneaky Snitch — Kevin MacLeod',
    'The Elevator Bossa Nova — Kevin MacLeod',
    'Marty Gots a Plan — Kevin MacLeod',
  ],
  deception: [
    'Spy Glass — Kevin MacLeod',
    'Oppressive Gloom — Kevin MacLeod',
    'Dark Hallway — Kevin MacLeod',
  ],
};

const PLAYLISTS = {
  hero: 'Heroes of History',
  bizarre: 'Bizarre History',
  deception: 'Secret Ops & Deception',
};

/** Rotate tracks so consecutive videos don't suggest the same music. */
function pickMusic(pillar, salt = 0) {
  const tracks = MUSIC_BANK[pillar] || MUSIC_BANK.hero;
  return tracks[salt % tracks.length];
}

function playlistFor(pillar) {
  return PLAYLISTS[pillar] || PLAYLISTS.hero;
}

module.exports = { pickMusic, playlistFor, MUSIC_BANK, PLAYLISTS };
