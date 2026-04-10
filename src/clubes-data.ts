// Caminho/Arquivo: src/clubes-data.ts
// Contexto: Limpeza de dados estáticos para forçar uso do Banco de Dados

export interface ClubData {
  nome: string;
  nome_curto: string;
  serie: string;
  cidade: string;
  estado: string;
  pais: string;
  mascote: string;
  logoUrl: string;
}

const getLogoUrl = (nome: string, cidade: string, estado: string, pais: string): string => {
  const normalize = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  
  const overrides: Record<string, string> = {
    "Vila Nova": "vila-nova-goiania-go-brasil",
    "Atlético-MG": "atletico-mg-belo-horizonte-mg-brasil",
    "Goiás": "goias-goiania-go-brasil",
    "Atlético-GO": "atletico-go-goiania-go-brasil",
    "Santos": "santos-santos-sp-brasil",
    "Athletico-PR": "athletico-pr-curitiba-pr-brasil",
    "Bayern Munich": "bayern-munich-munique-baviera-alemanha",
    "Bayer 04 Leverkusen": "bayer-04-leverkusen-leverkusen-germany-alemanha",
    "Borussia Dortmund": "borussia-dortmund-dortmund-rhenania-alemanha",
    "Paris Saint-Germain": "paris-saint-germain-paris-paris-franca",
    "Tottenham Hotspur": "tottenham-hotspur-londres-londres-inglaterra",
    "Manchester United": "manchester-united-manchester-england-inglaterra"
  };

  const slug = overrides[nome] || `${normalize(nome)}-${normalize(cidade)}-${normalize(estado)}-${normalize(pais)}`;
  return `/logos/${slug}.png`;
};

// Deixamos a lista vazia para exterminar duplicidades e forçar o uso do Supabase
const RAW_CLUBS: Omit<ClubData, 'logoUrl'>[] = [];

export const CLUBES: ClubData[] = RAW_CLUBS.map(club => ({
  ...club,
  logoUrl: getLogoUrl(club.nome, club.cidade, club.estado, club.pais)
}));

export const CLUBS_DATA: ClubData[] = RAW_CLUBS.map((c) => ({
  ...c,
  logoUrl: getLogoUrl(c.nome, c.cidade, c.estado, c.pais),
}));