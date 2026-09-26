async function main() {
  try {
    const res = await fetch('https://www.pexels.com/search/videos/ancient%20rome/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const regex = /https:\/\/videos\.pexels\.com\/video-files\/\d+\/[^"]+\.mp4/g;
    const matches = html.match(regex);
    console.log('Matches:', matches ? [...new Set(matches)].slice(0, 5) : 'None');
  } catch (err) {
    console.error(err);
  }
}
main();
