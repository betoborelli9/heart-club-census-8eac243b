// Path: src/pages/api/noticias.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'rss-parser';

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clube } = req.query;
  if (!clube) return res.status(400).json({ error: 'Clube missing' });

  try {
    const query = encodeURIComponent(`${clube} futebol`);
    const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${query}+when:7d&hl=pt-BR&gl=BR&ceid=BR:pt-419`);
    
    const items = feed.items.slice(0, 6).map(item => ({
      title: item.title?.split(' - ')[0],
      link: item.link,
      pubDate: item.pubDate,
      source: item.title?.split(' - ').pop(),
      guid: item.guid
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar' });
  }
}