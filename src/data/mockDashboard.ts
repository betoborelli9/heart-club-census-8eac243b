// Centralized mock data for the Super-App Dashboard

export interface MatchData {
  homeTeam: { name: string; emoji: string; shortName: string };
  awayTeam: { name: string; emoji: string; shortName: string };
  date: string;
  time: string;
  stadium: string;
  city: string;
  competition: string;
  round: string;
  probabilities: { home: number; draw: number; away: number };
  broadcasters: { name: string; color: string; bgColor: string }[];
  lineup: {
    formation: string;
    players: { name: string; number: number; position: string }[];
  };
}

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  imageUrl: string;
  time: string;
  category: string;
}

export interface Product {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  imageUrl: string;
  tag?: string;
}

export interface ContinentData {
  id: string;
  name: string;
  fans: number;
  path: string;
  countries: { name: string; fans: number }[];
}

export interface CensusClubRank {
  clubId: string;
  name: string;
  emoji: string;
  votes: number;
}

export interface Ambassador {
  name: string;
  avatar: string;
  count: number;
  goal: number;
  city: string;
}

// Match Center
export const mockMatch: MatchData = {
  homeTeam: { name: "Palmeiras", emoji: "🟢", shortName: "PAL" },
  awayTeam: { name: "Corinthians", emoji: "⚫", shortName: "COR" },
  date: "Domingo, 23 Fev",
  time: "19:00",
  stadium: "Allianz Parque",
  city: "São Paulo, SP",
  competition: "Brasileirão Série A",
  round: "Rodada 12",
  probabilities: { home: 52, draw: 24, away: 24 },
  broadcasters: [
    { name: "Globo", color: "hsl(0 0% 98%)", bgColor: "hsl(210 80% 45%)" },
    { name: "Premiere", color: "hsl(0 0% 98%)", bgColor: "hsl(270 60% 45%)" },
    { name: "SporTV", color: "hsl(0 0% 10%)", bgColor: "hsl(45 90% 55%)" },
    { name: "ESPN", color: "hsl(0 0% 98%)", bgColor: "hsl(0 75% 45%)" },
  ],
  lineup: {
    formation: "4-3-3",
    players: [
      { name: "Weverton", number: 21, position: "GK" },
      { name: "Marcos Rocha", number: 2, position: "RB" },
      { name: "Gustavo Gómez", number: 15, position: "CB" },
      { name: "Murilo", number: 26, position: "CB" },
      { name: "Piquerez", number: 22, position: "LB" },
      { name: "Zé Rafael", number: 8, position: "CM" },
      { name: "Richard Ríos", number: 27, position: "CM" },
      { name: "Raphael Veiga", number: 23, position: "CM" },
      { name: "Artur", number: 7, position: "RW" },
      { name: "Endrick", number: 9, position: "ST" },
      { name: "Estêvão", number: 41, position: "LW" },
    ],
  },
};

// News
export const mockNews: NewsItem[] = [
  {
    id: 1,
    title: "Reforço confirmado para a próxima temporada",
    summary: "Clube oficializa contratação de destaque do futebol europeu para reforçar o meio-campo.",
    imageUrl: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=400&h=250&fit=crop",
    time: "2h atrás",
    category: "Transferências",
  },
  {
    id: 2,
    title: "Treinador elogia desempenho do elenco no treino",
    summary: "Técnico destaca evolução tática e projeta escalação para o clássico de domingo.",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=250&fit=crop",
    time: "5h atrás",
    category: "Bastidores",
  },
  {
    id: 3,
    title: "Ingressos para o clássico esgotados em 2 horas",
    summary: "Torcida esgota todos os setores do estádio em tempo recorde para o grande jogo.",
    imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=250&fit=crop",
    time: "8h atrás",
    category: "Torcida",
  },
  {
    id: 4,
    title: "Base revelou mais um talento para o profissional",
    summary: "Jovem de 17 anos impressiona nos treinos e ganha chance no elenco principal.",
    imageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=250&fit=crop",
    time: "12h atrás",
    category: "Base",
  },
  {
    id: 5,
    title: "Novo uniforme 3 será lançado na próxima semana",
    summary: "Camisa homenageia conquista histórica e terá detalhes dourados exclusivos.",
    imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=250&fit=crop",
    time: "1d atrás",
    category: "Loja",
  },
];

// Marketplace
export const mockProducts: Product[] = [
  {
    id: 1,
    name: "Camisa Titular 2025",
    price: "R$ 299,90",
    originalPrice: "R$ 349,90",
    imageUrl: "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=300&h=300&fit=crop",
    tag: "Lançamento",
  },
  {
    id: 2,
    name: "Camisa Reserva 2025",
    price: "R$ 279,90",
    imageUrl: "https://images.unsplash.com/photo-1551854838-212c50b4c184?w=300&h=300&fit=crop",
  },
  {
    id: 3,
    name: "Agasalho Viagem",
    price: "R$ 399,90",
    originalPrice: "R$ 459,90",
    imageUrl: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=300&h=300&fit=crop",
    tag: "-13%",
  },
  {
    id: 4,
    name: "Caneca Oficial",
    price: "R$ 59,90",
    imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&h=300&fit=crop",
  },
];

// Heatmap
export const mockContinents: ContinentData[] = [
  {
    id: "south-america",
    name: "América do Sul",
    fans: 4250000,
    path: "M 285 340 L 310 310 L 330 340 L 340 380 L 330 430 L 310 470 L 290 490 L 280 460 L 270 420 L 260 380 Z",
    countries: [
      { name: "Brasil", fans: 3800000 },
      { name: "Argentina", fans: 180000 },
      { name: "Paraguai", fans: 95000 },
      { name: "Uruguai", fans: 75000 },
      { name: "Chile", fans: 50000 },
      { name: "Colômbia", fans: 50000 },
    ],
  },
  {
    id: "europe",
    name: "Europa",
    fans: 820000,
    path: "M 450 160 L 500 140 L 560 150 L 580 170 L 560 200 L 530 220 L 490 220 L 460 210 L 440 190 Z",
    countries: [
      { name: "Portugal", fans: 420000 },
      { name: "Espanha", fans: 150000 },
      { name: "Inglaterra", fans: 95000 },
      { name: "Itália", fans: 80000 },
      { name: "Alemanha", fans: 75000 },
    ],
  },
  {
    id: "north-america",
    name: "América do Norte",
    fans: 380000,
    path: "M 130 120 L 200 100 L 280 130 L 300 180 L 290 230 L 260 270 L 220 290 L 180 270 L 150 220 L 120 170 Z",
    countries: [
      { name: "Estados Unidos", fans: 220000 },
      { name: "México", fans: 95000 },
      { name: "Canadá", fans: 65000 },
    ],
  },
  {
    id: "asia",
    name: "Ásia",
    fans: 290000,
    path: "M 580 130 L 680 100 L 760 140 L 780 200 L 740 260 L 680 270 L 620 240 L 590 200 Z",
    countries: [
      { name: "Japão", fans: 120000 },
      { name: "China", fans: 85000 },
      { name: "Emirados Árabes", fans: 45000 },
      { name: "Índia", fans: 40000 },
    ],
  },
  {
    id: "africa",
    name: "África",
    fans: 180000,
    path: "M 450 240 L 510 230 L 560 260 L 570 320 L 550 380 L 520 410 L 480 400 L 450 360 L 440 300 Z",
    countries: [
      { name: "Angola", fans: 65000 },
      { name: "Moçambique", fans: 50000 },
      { name: "África do Sul", fans: 35000 },
      { name: "Nigéria", fans: 30000 },
    ],
  },
  {
    id: "oceania",
    name: "Oceania",
    fans: 45000,
    path: "M 720 360 L 770 340 L 810 360 L 820 400 L 790 420 L 750 410 L 720 390 Z",
    countries: [
      { name: "Austrália", fans: 35000 },
      { name: "Nova Zelândia", fans: 10000 },
    ],
  },
];

// Census Stats
export const mockCensusRanking: CensusClubRank[] = [
  { clubId: "flamengo", name: "Flamengo", emoji: "🔴", votes: 1850231 },
  { clubId: "palmeiras", name: "Palmeiras", emoji: "🟢", votes: 1450231 },
  { clubId: "corinthians", name: "Corinthians", emoji: "⚫", votes: 1320000 },
  { clubId: "sao-paulo", name: "São Paulo", emoji: "🔴", votes: 980000 },
  { clubId: "gremio", name: "Grêmio", emoji: "🔵", votes: 720000 },
];

export const totalVotes = 12450231;

// Ambassadors
export const mockAmbassadors: Ambassador[] = [
  { name: "Carlos M.", avatar: "CM", count: 142, goal: 200, city: "São Paulo" },
  { name: "Ana P.", avatar: "AP", count: 118, goal: 150, city: "Rio de Janeiro" },
  { name: "Roberto S.", avatar: "RS", count: 95, goal: 100, city: "Belo Horizonte" },
  { name: "Juliana C.", avatar: "JC", count: 87, goal: 100, city: "Curitiba" },
  { name: "Felipe A.", avatar: "FA", count: 74, goal: 100, city: "Porto Alegre" },
  { name: "Mariana L.", avatar: "ML", count: 68, goal: 100, city: "Salvador" },
  { name: "Diego R.", avatar: "DR", count: 52, goal: 80, city: "Fortaleza" },
  { name: "Patrícia N.", avatar: "PN", count: 45, goal: 80, city: "Recife" },
];
