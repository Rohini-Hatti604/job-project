import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

export async function fetchFeed(url) {
  const res = await axios.get(url, { timeout: 15000, responseType: 'text' });
  const data = parser.parse(res.data);
  return normalizeRssLike(data, url);
}

function normalizeRssLike(xmlJson, sourceUrl) {
  // Support common RSS/Atom shapes
  const channelItems = xmlJson?.rss?.channel?.item || [];
  const atomEntries = xmlJson?.feed?.entry || [];
  const items = Array.isArray(channelItems) ? channelItems : Array.isArray(atomEntries) ? atomEntries : [];

  return items.map((it) => {
    const title = it.title?.['#text'] || it.title || '';
    const link = it.link?.href || it.link || it.guid || '';
    const description = it.description || it.summary || it.content || '';
    const pubDate = it.pubDate || it.published || it.updated;
    const company = it['job:company'] || it.company || it.author?.name || undefined;
    const type = it['job:jobtype'] || it.type || undefined;
    const externalId = String(it.guid?.['#text'] || it.guid || link || title).trim();

    return {
      externalId,
      sourceUrl,
      title: String(title || '').trim(),
      company: company ? String(company).trim() : undefined,
      location: (it['job:location'] || it.location || '').toString(),
      type: type ? String(type).trim() : undefined,
      description: typeof description === 'string' ? description : JSON.stringify(description),
      link: typeof link === 'string' ? link : JSON.stringify(link),
      publishedAt: pubDate ? new Date(pubDate) : undefined,
      raw: it
    };
  });
}



