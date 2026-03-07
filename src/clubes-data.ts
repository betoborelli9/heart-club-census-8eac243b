// Caminho/Arquivo: src/clubes-data.ts
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
    "Atlético-MG": "atletico-mineiro-belo-horizonte-mg-brasil",
    "Goiás": "goias-goiania-go-brasil",
    "Atlético-GO": "atletico-goianiense-goiania-go-brasil",
    "Santos": "santos-santos-sp-brasil"
  };
  const slug = overrides[nome] || `${normalize(nome)}-${normalize(cidade)}-${normalize(estado)}-${normalize(pais)}`;
  return `/logos/${slug}.png`;
};

const RAW_CLUBS: Omit<ClubData, 'logoUrl'>[] = [
  { nome: 'Athletico-PR', nome_curto: 'CAP', serie: 'A', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil', mascote: 'Furacão' },
  { nome: 'Atlético-MG', nome_curto: 'CAM', serie: 'A', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', mascote: 'Galo' },
  { nome: 'Bahia', nome_curto: 'BAH', serie: 'A', cidade: 'Salvador', estado: 'BA', pais: 'Brasil', mascote: 'Super-Homem' },
  { nome: 'Botafogo', nome_curto: 'BOT', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Manequinho' },
  { nome: 'Corinthians', nome_curto: 'COR', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Mosqueteiro' },
  { nome: 'Cruzeiro', nome_curto: 'CRU', serie: 'A', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', mascote: 'Raposa' },
  { nome: 'Flamengo', nome_curto: 'FLA', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Urubu' },
  { nome: 'Fluminense', nome_curto: 'FLU', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Guerreiro' },
  { nome: 'Grêmio', nome_curto: 'GRE', serie: 'A', cidade: 'Porto Alegre', estado: 'RS', pais: 'Brasil', mascote: 'Mosqueteiro' },
  { nome: 'Internacional', nome_curto: 'INT', serie: 'A', cidade: 'Porto Alegre', estado: 'RS', pais: 'Brasil', mascote: 'Saci' },
  { nome: 'Palmeiras', nome_curto: 'PAL', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Periquito' },
  { nome: 'Santos', nome_curto: 'SAN', serie: 'A', cidade: 'Santos', estado: 'SP', pais: 'Brasil', mascote: 'Baleia' },
  { nome: 'São Paulo', nome_curto: 'SAO', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Santo Paulo' },
  { nome: 'Vasco', nome_curto: 'VAS', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Almirante' },
  { nome: 'Goiás', nome_curto: 'GOI', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Periquito' },
  { nome: 'Vila Nova', nome_curto: 'VIL', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Tigre' },
  { nome: 'Atlético-GO', nome_curto: 'ACG', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Dragão' },
  { nome: 'Juventude', nome_curto: 'JUV', serie: 'B', cidade: 'Caxias do Sul', estado: 'RS', pais: 'Brasil', mascote: 'Papo' },
  { nome: 'Sport', nome_curto: 'SPT', serie: 'B', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Leão' },
  ];

export const CLUBS_DATA: ClubData[] = RAW_CLUBS.map((c) => ({
  ...c,
  logoUrl: getLogoUrl(c.nome, c.cidade, c.estado, c.pais),
}));
// ═══git commit -m "fix: unificação de listas e correção de sintaxe"
// 
════════════════════════════════════════════════════════
  // SÉRIE C 2026 (20 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'Amazonas FC', nome_curto: 'AMA', serie: 'C', cidade: 'Manaus', estado: 'AM', pais: 'Brasil', mascote: 'Onça-Pintada' },
  { nome: 'Anápolis', nome_curto: 'ANA', serie: 'C', cidade: 'Anápolis', estado: 'GO', pais: 'Brasil', mascote: 'Galo da Comarca' },
  { nome: 'Barra-SC', nome_curto: 'BAR', serie: 'C', cidade: 'Balneario Camboriu', estado: 'SC', pais: 'Brasil', mascote: 'Pescador' },
  { nome: 'Botafogo-PB', nome_curto: 'BPB', serie: 'C', cidade: 'Joao Pessoa', estado: 'PB', pais: 'Brasil', mascote: 'Belo' },
  { nome: 'Brusque', nome_curto: 'BRU', serie: 'C', cidade: 'Brusque', estado: 'SC', pais: 'Brasil', mascote: 'Marreco' },
  { nome: 'Caxias', nome_curto: 'CAX', serie: 'C', cidade: 'Caxias do Sul', estado: 'RS', pais: 'Brasil', mascote: 'Bepe' },
  { nome: 'Confiança', nome_curto: 'CON', serie: 'C', cidade: 'Aracaju', estado: 'SE', pais: 'Brasil', mascote: 'Dragão' },
  { nome: 'Ferroviária', nome_curto: 'AFE', serie: 'C', cidade: 'Araraquara', estado: 'SP', pais: 'Brasil', mascote: 'Locomotiva' },
  { nome: 'Figueirense', nome_curto: 'FIG', serie: 'C', cidade: 'Florianopolis', estado: 'SC', pais: 'Brasil', mascote: 'Furacão' },
  { nome: 'Floresta', nome_curto: 'FLO', serie: 'C', cidade: 'Fortaleza', estado: 'CE', pais: 'Brasil', mascote: 'Lobo' },
  { nome: 'Guarani', nome_curto: 'GUA', serie: 'C', cidade: 'Campinas', estado: 'SP', pais: 'Brasil', mascote: 'Bugre' },
  { nome: 'Inter de Limeira', nome_curto: 'ITL', serie: 'C', cidade: 'Limeira', estado: 'SP', pais: 'Brasil', mascote: 'Leão' },
  { nome: 'Itabaiana', nome_curto: 'ITA', serie: 'C', cidade: 'Itabaiana', estado: 'SE', pais: 'Brasil', mascote: 'Tremendão' },
  { nome: 'Ituano', nome_curto: 'ITU', serie: 'C', cidade: 'Itu', estado: 'SP', pais: 'Brasil', mascote: 'Galo de Itu' },
  { nome: 'Maranhão', nome_curto: 'MAC', serie: 'C', cidade: 'Sao Luis', estado: 'MA', pais: 'Brasil', mascote: 'Demolidor' },
  { nome: 'Maringá', nome_curto: 'MGA', serie: 'C', cidade: 'Maringa', estado: 'PR', pais: 'Brasil', mascote: 'Dogão' },
  { nome: 'Paysandu', nome_curto: 'PAY', serie: 'C', cidade: 'Belem', estado: 'PA', pais: 'Brasil', mascote: 'Papão' },
  { nome: 'Santa Cruz', nome_curto: 'STC', serie: 'C', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Cobra Coral' },
  { nome: 'Volta Redonda', nome_curto: 'VRE', serie: 'C', cidade: 'Volta Redonda', estado: 'RJ', pais: 'Brasil', mascote: 'Voltaço' },
  { nome: 'Ypiranga-RS', nome_curto: 'YPI', serie: 'C', cidade: 'Erechim', estado: 'RS', pais: 'Brasil', mascote: 'Canarinho' },

  // ═══════════════════════════════════════════════════════════
  // SÉRIE C 2026 (20 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'Amazonas FC', nome_curto: 'AMA', serie: 'C', cidade: 'Manaus', estado: 'AM', pais: 'Brasil', mascote: 'Onça-Pintada' },
  { nome: 'Anápolis', nome_curto: 'ANA', serie: 'C', cidade: 'Anápolis', estado: 'GO', pais: 'Brasil', mascote: 'Galo da Comarca' },
  { nome: 'Barra-SC', nome_curto: 'BAR', serie: 'C', cidade: 'Balneario Camboriu', estado: 'SC', pais: 'Brasil', mascote: 'Pescador' },
  { nome: 'Botafogo-PB', nome_curto: 'BPB', serie: 'C', cidade: 'Joao Pessoa', estado: 'PB', pais: 'Brasil', mascote: 'Belo' },
  { nome: 'Brusque', nome_curto: 'BRU', serie: 'C', cidade: 'Brusque', estado: 'SC', pais: 'Brasil', mascote: 'Marreco' },
  { nome: 'Caxias', nome_curto: 'CAX', serie: 'C', cidade: 'Caxias do Sul', estado: 'RS', pais: 'Brasil', mascote: 'Bepe' },
  { nome: 'Confiança', nome_curto: 'CON', serie: 'C', cidade: 'Aracaju', estado: 'SE', pais: 'Brasil', mascote: 'Dragão' },
  { nome: 'Ferroviária', nome_curto: 'AFE', serie: 'C', cidade: 'Araraquara', estado: 'SP', pais: 'Brasil', mascote: 'Locomotiva' },
  { nome: 'Figueirense', nome_curto: 'FIG', serie: 'C', cidade: 'Florianopolis', estado: 'SC', pais: 'Brasil', mascote: 'Furacão' },
  { nome: 'Floresta', nome_curto: 'FLO', serie: 'C', cidade: 'Fortaleza', estado: 'CE', pais: 'Brasil', mascote: 'Lobo' },
  { nome: 'Guarani', nome_curto: 'GUA', serie: 'C', cidade: 'Campinas', estado: 'SP', pais: 'Brasil', mascote: 'Bugre' },
  { nome: 'Inter de Limeira', nome_curto: 'ITL', serie: 'C', cidade: 'Limeira', estado: 'SP', pais: 'Brasil', mascote: 'Leão' },
  { nome: 'Itabaiana', nome_curto: 'ITA', serie: 'C', cidade: 'Itabaiana', estado: 'SE', pais: 'Brasil', mascote: 'Tremendão' },
  { nome: 'Ituano', nome_curto: 'ITU', serie: 'C', cidade: 'Itu', estado: 'SP', pais: 'Brasil', mascote: 'Galo de Itu' },
  { nome: 'Maranhão', nome_curto: 'MAC', serie: 'C', cidade: 'Sao Luis', estado: 'MA', pais: 'Brasil', mascote: 'Demolidor' },
  { nome: 'Maringá', nome_curto: 'MGA', serie: 'C', cidade: 'Maringa', estado: 'PR', pais: 'Brasil', mascote: 'Dogão' },
  { nome: 'Paysandu', nome_curto: 'PAY', serie: 'C', cidade: 'Belem', estado: 'PA', pais: 'Brasil', mascote: 'Papão' },
  { nome: 'Santa Cruz', nome_curto: 'STC', serie: 'C', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Cobra Coral' },
  { nome: 'Volta Redonda', nome_curto: 'VRE', serie: 'C', cidade: 'Volta Redonda', estado: 'RJ', pais: 'Brasil', mascote: 'Voltaço' },
  { nome: 'Ypiranga-RS', nome_curto: 'YPI', serie: 'C', cidade: 'Erechim', estado: 'RS', pais: 'Brasil', mascote: 'Canarinho' },

  // ═══════════════════════════════════════════════════════════
  // SÉRIE D 2026 (PRINCIPAIS DESTAQUES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'ABC', nome_curto: 'ABC', serie: 'D', cidade: 'Natal', estado: 'RN', pais: 'Brasil', mascote: 'Elefante' },
  { nome: 'ABECAT', nome_curto: 'ABE', serie: 'D', cidade: 'Ouvidor', estado: 'GO', pais: 'Brasil', mascote: 'Gato' },
  { nome: 'Água Santa', nome_curto: 'AGU', serie: 'D', cidade: 'Diadema', estado: 'SP', pais: 'Brasil', mascote: 'Netuno' },
  { nome: 'America-RJ', nome_curto: 'ARJ', serie: 'D', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Diabo' },
  { nome: 'América-RN', nome_curto: 'ARN', serie: 'D', cidade: 'Natal', estado: 'RN', pais: 'Brasil', mascote: 'Mecão' },
  { nome: 'Aparecidense', nome_curto: 'APA', serie: 'D', cidade: 'Aparecida de Goiania', estado: 'GO', pais: 'Brasil', mascote: 'Camaleão' },
  { nome: 'CRAC', nome_curto: 'CRA', serie: 'D', cidade: 'Catalao', estado: 'GO', pais: 'Brasil', mascote: 'Leão do Sul' },
  { nome: 'Gama', nome_curto: 'GAM', serie: 'D', cidade: 'Gama', estado: 'DF', pais: 'Brasil', mascote: 'Periquito' },
  { nome: 'Goiatuba', nome_curto: 'GTB', serie: 'D', cidade: 'Goiatuba', estado: 'GO', pais: 'Brasil', mascote: 'Azulão' },
  { nome: 'Inhumas', nome_curto: 'INH', serie: 'D', cidade: 'Inhumas', estado: 'GO', pais: 'Brasil', mascote: 'Pantera' },
  { nome: 'Retrô', nome_curto: 'RET', serie: 'D', cidade: 'Camaragibe', estado: 'PE', pais: 'Brasil', mascote: 'Fênix' },
  { nome: 'Tombense', nome_curto: 'TOM', serie: 'D', cidade: 'Tombos', estado: 'MG', pais: 'Brasil', mascote: 'Gavião' },
  { nome: 'XV de Piracicaba', nome_curto: 'XVP', serie: 'D', cidade: 'Piracicaba', estado: 'SP', pais: 'Brasil', mascote: 'Nhô Quim' },
  // ═══════════════════════════════════════════════════════════
  // INTERNACIONAL - EUROPA (50 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'Real Madrid', nome_curto: 'RMA', serie: 'EUR', cidade: 'Madrid', estado: 'Madrid', pais: 'Espanha', mascote: 'Merengues' },
  { nome: 'Barcelona', nome_curto: 'BAR', serie: 'EUR', cidade: 'Barcelona', estado: 'Catalunha', pais: 'Espanha', mascote: 'Culés' },
  { nome: 'Manchester City', nome_curto: 'MCI', serie: 'EUR', cidade: 'Manchester', estado: 'Manchester', pais: 'Inglaterra', mascote: 'Moonchester' },
  { nome: 'Liverpool', nome_curto: 'LIV', serie: 'EUR', cidade: 'Liverpool', estado: 'Merseyside', pais: 'Inglaterra', mascote: 'Mighty Red' },
  { nome: 'Bayern Munich', nome_curto: 'BAY', serie: 'EUR', cidade: 'Munique', estado: 'Baviera', pais: 'Alemanha', mascote: 'Berni' },
  { nome: 'Manchester United', nome_curto: 'MUN', serie: 'EUR', cidade: 'Manchester', estado: 'Manchester', pais: 'Inglaterra', mascote: 'Fred Red' },
  { nome: 'Juventus', nome_curto: 'JUV', serie: 'EUR', cidade: 'Turim', estado: 'Piemonte', pais: 'Italia', mascote: 'Jay' },
  { nome: 'PSG', nome_curto: 'PSG', serie: 'EUR', cidade: 'Paris', estado: 'Paris', pais: 'Franca', mascote: 'Germain' },
  { nome: 'Arsenal', nome_curto: 'ARS', serie: 'EUR', cidade: 'Londres', estado: 'Londres', pais: 'Inglaterra', mascote: 'Gunnersaurus' },
  { nome: 'Chelsea', nome_curto: 'CHE', serie: 'EUR', cidade: 'Londres', estado: 'Londres', pais: 'Inglaterra', mascote: 'Lion' },
  { nome: 'AC Milan', nome_curto: 'ACM', serie: 'EUR', cidade: 'Milao', estado: 'Lombardia', pais: 'Italia', mascote: 'Diavolo' },
  { nome: 'Inter Milan', nome_curto: 'INT', serie: 'EUR', cidade: 'Milao', estado: 'Lombardia', pais: 'Italia', mascote: 'Biscione' },
  { nome: 'Atletico Madrid', nome_curto: 'ATM', serie: 'EUR', cidade: 'Madrid', estado: 'Madrid', pais: 'Espanha', mascote: 'Indi' },
  { nome: 'Dortmund', nome_curto: 'BVB', serie: 'EUR', cidade: 'Dortmund', estado: 'Rhenania', pais: 'Alemanha', mascote: 'Emma' },
  { nome: 'Tottenham', nome_curto: 'TOT', serie: 'EUR', cidade: 'Londres', estado: 'Londres', pais: 'Inglaterra', mascote: 'Chirpy' },
  { nome: 'Benfica', nome_curto: 'SLB', serie: 'EUR', cidade: 'Lisboa', estado: 'Lisboa', pais: 'Portugal', mascote: 'Aguia' },
  { nome: 'FC Porto', nome_curto: 'FCP', serie: 'EUR', cidade: 'Porto', estado: 'Porto', pais: 'Portugal', mascote: 'Draco' },
  { nome: 'Sporting CP', nome_curto: 'SCP', serie: 'EUR', cidade: 'Lisboa', estado: 'Lisboa', pais: 'Portugal', mascote: 'Leao' },
  { nome: 'Ajax', nome_curto: 'AJX', serie: 'EUR', cidade: 'Amsterda', estado: 'Holanda do Norte', pais: 'Holanda', mascote: 'Lucky' },
  { nome: 'Napoli', nome_curto: 'NAP', serie: 'EUR', cidade: 'Napoles', estado: 'Campania', pais: 'Italia', mascote: 'O Ciuccio' },
  { nome: 'AS Roma', nome_curto: 'ROM', serie: 'EUR', cidade: 'Roma', estado: 'Lazio', pais: 'Italia', mascote: 'Romolo' },
  { nome: 'Sevilla', nome_curto: 'SEV', serie: 'EUR', cidade: 'Sevilha', estado: 'Andaluzia', pais: 'Espanha', mascote: 'El Giraldis' },
  { nome: 'Wolfsburg', nome_curto: 'WOL', serie: 'EUR', cidade: 'Wolfsburg', estado: 'Baixa Saxonia', pais: 'Alemanha', mascote: 'Wolfi' },
  { nome: 'Bayer Leverkusen', nome_curto: 'B04', serie: 'EUR', cidade: 'Leverkusen', estado: 'Rhein', pais: 'Alemanha', mascote: 'Brian' },
  { nome: 'Eintracht Frankfurt', nome_curto: 'SGE', serie: 'EUR', cidade: 'Frankfurt', estado: 'Hessen', pais: 'Alemanha', mascote: 'Attila' },
  { nome: 'Lazio', nome_curto: 'LAZ', serie: 'EUR', cidade: 'Roma', estado: 'Lazio', pais: 'Italia', mascote: 'Olimpia' },
  { nome: 'Fiorentina', nome_curto: 'FIO', serie: 'EUR', cidade: 'Florenca', estado: 'Toscana', pais: 'Italia', mascote: 'Viola' },
  { nome: 'Atalanta', nome_curto: 'ATA', serie: 'EUR', cidade: 'Bergamo', estado: 'Lombardia', pais: 'Italia', mascote: 'La Dea' },
  { nome: 'Villarreal', nome_curto: 'VIL', serie: 'EUR', cidade: 'Vila-real', estado: 'Castellon', pais: 'Espanha', mascote: 'Groguet' },
  { nome: 'Valencia', nome_curto: 'VAL', serie: 'EUR', cidade: 'Valencia', estado: 'Valencia', pais: 'Espanha', mascote: 'Morcego' },
  { nome: 'Athletic Bilbao', nome_curto: 'ATH', serie: 'EUR', cidade: 'Bilbao', estado: 'Basco', pais: 'Espanha', mascote: 'Leones' },
  { nome: 'Real Sociedad', nome_curto: 'RSO', serie: 'EUR', cidade: 'San Sebastian', estado: 'Basco', pais: 'Espanha', mascote: 'Txuri-urdin' },
  { nome: 'Marseille', nome_curto: 'OM', serie: 'EUR', cidade: 'Marselha', estado: 'Provenca', pais: 'Franca', mascote: 'Droit au But' },
  { nome: 'Lyon', nome_curto: 'OL', serie: 'EUR', cidade: 'Lyon', estado: 'Rhone', pais: 'Franca', mascote: 'Lino' },
  { nome: 'Monaco', nome_curto: 'ASM', serie: 'EUR', cidade: 'Monaco', estado: 'Monaco', pais: 'Monaco', mascote: 'Hercules' },
  { nome: 'Lille', nome_curto: 'LOSC', serie: 'EUR', cidade: 'Lille', estado: 'Nord', pais: 'Franca', mascote: 'Dogue' },
  { nome: 'Feyenoord', nome_curto: 'FEY', serie: 'EUR', cidade: 'Roterda', estado: 'Holanda do Sul', pais: 'Holanda', mascote: 'Coentje' },
  { nome: 'PSV Eindhoven', nome_curto: 'PSV', serie: 'EUR', cidade: 'Eindhoven', estado: 'Brabante', pais: 'Holanda', mascote: 'Phoxy' },
  { nome: 'Celtic', nome_curto: 'CEL', serie: 'EUR', cidade: 'Glasgow', estado: 'Escocia', pais: 'Escocia', mascote: 'Hoopy' },
  { nome: 'Rangers', nome_curto: 'RAN', serie: 'EUR', cidade: 'Glasgow', estado: 'Escocia', pais: 'Escocia', mascote: 'Broxi' },
  { nome: 'Galatasaray', nome_curto: 'GAL', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Aslan' },
  { nome: 'Fenerbahce', nome_curto: 'FEN', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Kanarya' },
  { nome: 'Besiktas', nome_curto: 'BES', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Kartal' },
  { nome: 'Shakhtar Donetsk', nome_curto: 'SHA', serie: 'EUR', cidade: 'Donetsk', estado: 'Donetsk', pais: 'Ucrania', mascote: 'Minerador' },
  { nome: 'Dynamo Kyiv', nome_curto: 'DKV', serie: 'EUR', cidade: 'Kiev', estado: 'Kiev', pais: 'Ucrania', mascote: 'Kyi' },
  { nome: 'Zenit', nome_curto: 'ZEN', serie: 'EUR', cidade: 'Sao Petersburgo', estado: 'St Petersburg', pais: 'Russia', mascote: 'Lion' },
  { nome: 'Olympiakos', nome_curto: 'OLY', serie: 'EUR', cidade: 'Pireu', estado: 'Atica', pais: 'Grecia', mascote: 'Thrylos' },
  { nome: 'Panathinaikos', nome_curto: 'PAN', serie: 'EUR', cidade: 'Atenas', estado: 'Atica', pais: 'Grecia', mascote: 'Trevo' },
  { nome: 'Aston Villa', nome_curto: 'AVL', serie: 'EUR', cidade: 'Birmingham', estado: 'West Midlands', pais: 'Inglaterra', mascote: 'Hercules' },
  { nome: 'West Ham', nome_curto: 'WHU', serie: 'EUR', cidade: 'Londres', estado: 'Londres', pais: 'Inglaterra', mascote: 'Hammer' },

  // ═══════════════════════════════════════════════════════════
  // INTERNACIONAL - AMÉRICA DO SUL (30 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'Boca Juniors', nome_curto: 'BOC', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Xeneize' },
  { nome: 'River Plate', nome_curto: 'RIV', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Millonario' },
  { nome: 'Independiente', nome_curto: 'IND', serie: 'INT', cidade: 'Avellaneda', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Diablo Rojo' },
  { nome: 'Racing Club', nome_curto: 'RAC', serie: 'INT', cidade: 'Avellaneda', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'La Academia' },
  { nome: 'San Lorenzo', nome_curto: 'SLO', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Ciclon' },
  { nome: 'Velez Sarsfield', nome_curto: 'VEL', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Fortin' },
  { nome: 'Estudiantes', nome_curto: 'EST', serie: 'INT', cidade: 'La Plata', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Pincha' },
  { nome: 'Peñarol', nome_curto: 'PEN', serie: 'INT', cidade: 'Montevideo', estado: 'Montevideo', pais: 'Uruguai', mascote: 'Manya' },
  { nome: 'Nacional-URU', nome_curto: 'NAC', serie: 'INT', cidade: 'Montevideo', estado: 'Montevideo', pais: 'Uruguai', mascote: 'Bolso' },
  { nome: 'Olimpia', nome_curto: 'OLI', serie: 'INT', cidade: 'Assuncao', estado: 'Central', pais: 'Paraguai', mascote: 'Decano' },
  { nome: 'Cerro Porteño', nome_curto: 'CCP', serie: 'INT', cidade: 'Assuncao', estado: 'Central', pais: 'Paraguai', mascote: 'Ciclon' },
  { nome: 'Libertad', nome_curto: 'LIB', serie: 'INT', cidade: 'Assuncao', estado: 'Central', pais: 'Paraguai', mascote: 'Gumarelo' },
  { nome: 'Atletico Nacional', nome_curto: 'ATN', serie: 'INT', cidade: 'Medellin', estado: 'Antioquia', pais: 'Colombia', mascote: 'Verdolaga' },
  { nome: 'Millonarios', nome_curto: 'MIL', serie: 'INT', cidade: 'Bogota', estado: 'Cundinamarca', pais: 'Colombia', mascote: 'Embajador' },
  { nome: 'América de Cali', nome_curto: 'AME', serie: 'INT', cidade: 'Cali', estado: 'Valle', pais: 'Colombia', mascote: 'Diablo' },
  { nome: 'Colo-Colo', nome_curto: 'COL', serie: 'INT', cidade: 'Santiago', estado: 'Metropolitana', pais: 'Chile', mascote: 'Cacique' },
  { nome: 'U. de Chile', nome_curto: 'UCH', serie: 'INT', cidade: 'Santiago', estado: 'Metropolitana', pais: 'Chile', mascote: 'Chuncho' },
  { nome: 'U. Católica', nome_curto: 'UCA', serie: 'INT', cidade: 'Santiago', estado: 'Metropolitana', pais: 'Chile', mascote: 'Cruzado' },
  { nome: 'LDU Quito', nome_curto: 'LDU', serie: 'INT', cidade: 'Quito', estado: 'Pichincha', pais: 'Equador', mascote: 'Rey de Copas' },
  { nome: 'Barcelona-EQU', nome_curto: 'BAR', serie: 'INT', cidade: 'Guayaquil', estado: 'Guayas', pais: 'Equador', mascote: 'Idolo' },
  { nome: 'Ind. del Valle', nome_curto: 'IDV', serie: 'INT', cidade: 'Sangolqui', estado: 'Pichincha', pais: 'Equador', mascote: 'Rayado' },
  { nome: 'Alianza Lima', nome_curto: 'ALI', serie: 'INT', cidade: 'Lima', estado: 'Lima', pais: 'Peru', mascote: 'Potrillo' },
  { nome: 'Universitario', nome_curto: 'UNI', serie: 'INT', cidade: 'Lima', estado: 'Lima', pais: 'Peru', mascote: 'Merengue' },
  { nome: 'Sporting Cristal', nome_curto: 'SCR', serie: 'INT', cidade: 'Lima', estado: 'Lima', pais: 'Peru', mascote: 'Celeste' },
  { nome: 'Bolivar', nome_curto: 'BOL', serie: 'INT', cidade: 'La Paz', estado: 'La Paz', pais: 'Bolivia', mascote: 'Academia' },
  { nome: 'The Strongest', nome_curto: 'STR', serie: 'INT', cidade: 'La Paz', estado: 'La Paz', pais: 'Bolivia', mascote: 'Tigre' },
  { nome: 'Caracas FC', nome_curto: 'CFC', serie: 'INT', cidade: 'Caracas', estado: 'Capital', pais: 'Venezuela', mascote: 'Rojo' },
  { nome: 'Dep. Tachira', nome_curto: 'TAC', serie: 'INT', cidade: 'San Cristobal', estado: 'Tachira', pais: 'Venezuela', mascote: 'Aurinegro' },
  { nome: 'Emelec', nome_curto: 'EME', serie: 'INT', cidade: 'Guayaquil', estado: 'Guayas', pais: 'Equador', mascote: 'Electrico' },
  { nome: 'Defensor Sporting', nome_curto: 'DEF', serie: 'INT', cidade: 'Montevideo', estado: 'Montevideo', pais: 'Uruguai', mascote: 'Violeta' },
];

/** Lista mestra com logoUrl resolvido via Slugs Semânticos */
export const CLUBS_DATA: ClubData[] = RAW_CLUBS.map((c) => ({
  ...c,
  logoUrl: getLogoUrl(c.nome, c.cidade, c.estado, c.pais),
}));

