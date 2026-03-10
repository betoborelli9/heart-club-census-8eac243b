import type { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'rss-parser';

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  guid: string;
};

const parser = new Parser();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NewsItem[] | { error: string }>
) {
  const { clube } = req.query;

  if (!clube || typeof clube !== 'string') {
    return res.status(400).json({ error: 'Parâmetro clube é obrigatório.' });
  }

  try {
    const query = encodeURIComponent(`${clube} futebol when:7d`);
    const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    
    const feed = await parser.parseURL(feedUrl);

    const newsItems: NewsItem[] = feed.items.slice(0, 6).map((item) => {
      const titleParts = item.title ? item.title.split(' - ') : ['Sem título'];
      const title = titleParts.slice(0, -1).join(' - ') || titleParts[0];
      const source = titleParts.length > 1 ? titleParts[titleParts.length - 1] : 'Portal de Notícias';

      return {
        title: title,
        link: item.link || '',
        pubDate: item.pubDate || new Date().toISOString(),
        source: source,
        guid: item.guid || item.link || title,
      };
    });

    res.status(200).json(newsItems);
  } catch (error) {
    console.error(`Erro ao buscar notícias do clube ${clube}:`, error);
    res.status(500).json({ error: 'Erro ao buscar notícias.' });
  }
}
