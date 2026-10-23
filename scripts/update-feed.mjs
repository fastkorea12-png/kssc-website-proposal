// site/feed.json의 채널 설정을 읽어 블로그(네이버 RSS)·유튜브 최신 글을 채운다.
// 인스타그램은 공개 RSS가 없어 feed.json에 직접 적은 게시물을 그대로 둔다.
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../site/feed.json', import.meta.url);
const PER_CHANNEL = 6;
const feed = JSON.parse(await readFile(FILE, 'utf8'));

const pick = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() : '';
};
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function getText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'kssc-feed-updater' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function blogPosts(rss) {
  const xml = await getText(rss);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, PER_CHANNEL).map(([, item]) => {
    const description = pick(item, 'description');
    const img = description.match(/<img[^>]+src="([^"]+)"/);
    return {
      channel: 'blog',
      title: decode(pick(item, 'title')),
      url: pick(item, 'link'),
      date: new Date(pick(item, 'pubDate')).toISOString(),
      thumb: img ? decode(img[1]) : null,
    };
  });
}

async function youtubePosts(channelId) {
  const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, PER_CHANNEL).map(([, entry]) => ({
    channel: 'youtube',
    title: decode(pick(entry, 'title')),
    url: (entry.match(/<link[^>]+href="([^"]+)"/) || [])[1] || '',
    date: pick(entry, 'published'),
    thumb: (entry.match(/<media:thumbnail[^>]+url="([^"]+)"/) || [])[1] || null,
  }));
}

// 채널 하나가 실패하면(유튜브 피드는 가끔 404를 낸다) 그 채널의 기존 게시물을 유지한다
const previous = (channel) => (feed.posts || []).filter((p) => p.channel === channel);
async function load(channel, enabled, fetcher) {
  if (!enabled) return previous(channel);
  try {
    return await fetcher();
  } catch (error) {
    console.warn(`${channel}: ${error.message} — keeping previous posts`);
    return previous(channel);
  }
}

const { blog, youtube } = feed.channels;
const posts = [
  ...await load('blog', blog?.rss, () => blogPosts(blog.rss)),
  ...await load('youtube', youtube?.channelId, () => youtubePosts(youtube.channelId)),
  ...previous('instagram'),
].sort((a, b) => new Date(b.date) - new Date(a.date));
const changed = JSON.stringify(posts) !== JSON.stringify(feed.posts);
if (changed) {
  feed.posts = posts;
  feed.updated = new Date().toISOString();
  await writeFile(FILE, `${JSON.stringify(feed, null, 2)}\n`);
}
console.log(changed ? `updated: ${posts.length} posts` : 'no change');
