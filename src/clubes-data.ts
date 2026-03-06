/* Caminho: src/clubes-data.ts
   Objetivo: Lista Mestra Unificada Heart Club 2026 - COMPLETA E CORRIGIDA
   Campos: api_id, nome, nome_curto, serie, cidade, estado, pais, mascote
*/

export interface ClubData {
  api_id: number;
  nome: string;
  nome_curto: string;
  serie: string;
  cidade: string;
  estado: string;
  pais: string;
  mascote: string;
  logoUrl: string;
}

/* Overrides manuais para clubes cujo api_id não bate no CDN padrão */
const LOGO_OVERRIDES: Record<string, string> = {
  "Anápolis": "https://upload.wikimedia.org/wikipedia/pt/8/85/An%C3%A1polis-GO_%28BRA%29.png",
};

const buildLogo = (nome: string, apiId: number) =>
  LOGO_OVERRIDES[nome] || `https://media.api-sports.io/football/teams/${apiId}.png`;

const RAW_CLUBS: Omit<ClubData, 'logoUrl'>[] = [
  // ═══════════════════════════════════════════════════════════
  // SÉRIE A 2026 (20 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { api_id: 154, nome: 'Athletico-PR', nome_curto: 'CAP', serie: 'A', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil', mascote: 'Furacão' },
  { api_id: 1063, nome: 'Atlético-MG', nome_curto: 'CAM', serie: 'A', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', mascote: 'Galo' },
  { api_id: 118, nome: 'Bahia', nome_curto: 'BAH', serie: 'A', cidade: 'Salvador', estado: 'BA', pais: 'Brasil', mascote: 'Super-Homem (Tricolor de Aço)' },
  { api_id: 120, nome: 'Botafogo', nome_curto: 'BOT', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Manequinho' },
  { api_id: 141, nome: 'Chapecoense', nome_curto: 'CHA', serie: 'A', cidade: 'Chapecó', estado: 'SC', pais: 'Brasil', mascote: 'Índio Condá' },
  { api_id: 131, nome: 'Corinthians', nome_curto: 'COR', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Mosqueteiro' },
  { api_id: 138, nome: 'Coritiba', nome_curto: 'CFC', serie: 'A', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil', mascote: 'Vovô Coxa' },
  { api_id: 135, nome: 'Cruzeiro', nome_curto: 'CRU', serie: 'A', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', mascote: 'Raposa' },
  { api_id: 127, nome: 'Flamengo', nome_curto: 'FLA', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Urubu' },
  { api_id: 124, nome: 'Fluminense', nome_curto: 'FLU', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Guerreiro Tricolor' },
  { api_id: 130, nome: 'Grêmio', nome_curto: 'GRE', serie: 'A', cidade: 'Porto Alegre', estado: 'RS', pais: 'Brasil', mascote: 'Mosqueteiro' },
  { api_id: 119, nome: 'Internacional', nome_curto: 'INT', serie: 'A', cidade: 'Porto Alegre', estado: 'RS', pais: 'Brasil', mascote: 'Saci' },
  { api_id: 1043, nome: 'Mirassol', nome_curto: 'MIR', serie: 'A', cidade: 'Mirassol', estado: 'SP', pais: 'Brasil', mascote: 'Leão' },
  { api_id: 121, nome: 'Palmeiras', nome_curto: 'PAL', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Periquito' },
  { api_id: 140, nome: 'Bragantino', nome_curto: 'BGT', serie: 'A', cidade: 'Bragança Paulista', estado: 'SP', pais: 'Brasil', mascote: 'Massa Bruta' },
  { api_id: 139, nome: 'Remo', nome_curto: 'REM', serie: 'A', cidade: 'Belém', estado: 'PA', pais: 'Brasil', mascote: 'Leão Azul' },
  { api_id: 149, nome: 'Santos', nome_curto: 'SAN', serie: 'A', cidade: 'Santos', estado: 'SP', pais: 'Brasil', mascote: 'Baleia' },
  { api_id: 126, nome: 'São Paulo', nome_curto: 'SAO', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Santo Paulo' },
  { api_id: 133, nome: 'Vasco', nome_curto: 'VAS', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Almirante' },
  { api_id: 134, nome: 'Vitória', nome_curto: 'VIT', serie: 'A', cidade: 'Salvador', estado: 'BA', pais: 'Brasil', mascote: 'Leão' },

  // ═══════════════════════════════════════════════════════════
  // SÉRIE B 2026 (20 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { api_id: 153, nome: 'América-MG', nome_curto: 'AMG', serie: 'B', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', mascote: 'Coelho' },
  { api_id: 10065, nome: 'Athletic Club', nome_curto: 'ATH', serie: 'B', cidade: 'São João del-Rei', estado: 'MG', pais: 'Brasil', mascote: 'Esquilo' },
  { api_id: 1061, nome: 'Atlético-GO', nome_curto: 'ACG', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Dragão' },
  { api_id: 144, nome: 'Avaí', nome_curto: 'AVA', serie: 'B', cidade: 'Florianópolis', estado: 'SC', pais: 'Brasil', mascote: 'Leão da Ilha' },
  { api_id: 1050, nome: 'Botafogo-SP', nome_curto: 'BSP', serie: 'B', cidade: 'Ribeirão Preto', estado: 'SP', pais: 'Brasil', mascote: 'Pantera' },
  { api_id: 148, nome: 'Ceará', nome_curto: 'CEA', serie: 'B', cidade: 'Fortaleza', estado: 'CE', pais: 'Brasil', mascote: 'Vozão' },
  { api_id: 1056, nome: 'CRB', nome_curto: 'CRB', serie: 'B', cidade: 'Maceió', estado: 'AL', pais: 'Brasil', mascote: 'Galo' },
  { api_id: 147, nome: 'Criciúma', nome_curto: 'CRI', serie: 'B', cidade: 'Criciúma', estado: 'SC', pais: 'Brasil', mascote: 'Tigre' },
  { api_id: 1060, nome: 'Cuiabá', nome_curto: 'CUI', serie: 'B', cidade: 'Cuiabá', estado: 'MT', pais: 'Brasil', mascote: 'Dourado' },
  { api_id: 136, nome: 'Fortaleza', nome_curto: 'FOR', serie: 'B', cidade: 'Fortaleza', estado: 'CE', pais: 'Brasil', mascote: 'Leão do Pici' },
  { api_id: 151, nome: 'Goiás', nome_curto: 'GOI', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Periquito' },
  { api_id: 142, nome: 'Juventude', nome_curto: 'JUV', serie: 'B', cidade: 'Caxias do Sul', estado: 'RS', pais: 'Brasil', mascote: 'Papo' },
  { api_id: 152, nome: 'Londrina', nome_curto: 'LON', serie: 'B', cidade: 'Londrina', estado: 'PR', pais: 'Brasil', mascote: 'Tubarão' },
  { api_id: 1053, nome: 'Náutico', nome_curto: 'NAU', serie: 'B', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Timbu' },
  { api_id: 1054, nome: 'Novorizontino', nome_curto: 'NOV', serie: 'B', cidade: 'Novo Horizonte', estado: 'SP', pais: 'Brasil', mascote: 'Tigre' },
  { api_id: 1057, nome: 'Operário-PR', nome_curto: 'OPE', serie: 'B', cidade: 'Ponta Grossa', estado: 'PR', pais: 'Brasil', mascote: 'Fantasma' },
  { api_id: 1052, nome: 'Ponte Preta', nome_curto: 'PON', serie: 'B', cidade: 'Campinas', estado: 'SP', pais: 'Brasil', mascote: 'Macaca' },
  { api_id: 1049, nome: 'São Bernardo', nome_curto: 'SBE', serie: 'B', cidade: 'São Bernardo do Campo', estado: 'SP', pais: 'Brasil', mascote: 'Tigre' },
  { api_id: 143, nome: 'Sport', nome_curto: 'SPT', serie: 'B', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Leão' },
  { api_id: 1062, nome: 'Vila Nova', nome_curto: 'VIL', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Tigre' },

  // ═══════════════════════════════════════════════════════════
  // SÉRIE C 2026 (20 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { api_id: 10069, nome: 'Amazonas FC', nome_curto: 'AMA', serie: 'C', cidade: 'Manaus', estado: 'AM', pais: 'Brasil', mascote: 'Onça-Pintada' },
  { api_id: 11943, nome: 'Anápolis', nome_curto: 'ANA', serie: 'C', cidade: 'Anápolis', estado: 'GO', pais: 'Brasil', mascote: 'Xavante' },
  { api_id: 11033, nome: 'Barra-SC', nome_curto: 'BAR', serie: 'C', cidade: 'Balneário Camboriú', estado: 'SC', pais: 'Brasil', mascote: 'Leão' },
  { api_id: 1055, nome: 'Botafogo-PB', nome_curto: 'BPB', serie: 'C', cidade: 'João Pessoa', estado: 'PB', pais: 'Brasil', mascote: 'Belo' },
  { api_id: 1059, nome: 'Brusque', nome_curto: 'BRU', serie: 'C', cidade: 'Brusque', estado: 'SC', pais: 'Brasil', mascote: 'Marreco' },
  { api_id: 1011, nome: 'Caxias', nome_curto: 'CAX', serie: 'C', cidade: 'Caxias do Sul', estado: 'RS', pais: 'Brasil', mascote: 'Grená' },
  { api_id: 1058, nome: 'Confiança', nome_curto: 'CON', serie: 'C', cidade: 'Aracaju', estado: 'SE', pais: 'Brasil', mascote: 'Dragão' },
  { api_id: 1046, nome: 'Ferroviária', nome_curto: 'AFE', serie: 'C', cidade: 'Araraquara', estado: 'SP', pais: 'Brasil', mascote: 'Locomotiva' },
  { api_id: 145, nome: 'Figueirense', nome_curto: 'FIG', serie: 'C', cidade: 'Florianópolis', estado: 'SC', pais: 'Brasil', mascote: 'Figueira' },
  { api_id: 2541, nome: 'Floresta', nome_curto: 'FLO', serie: 'C', cidade: 'Fortaleza', estado: 'CE', pais: 'Brasil', mascote: 'Lobo' },
  { api_id: 1051, nome: 'Guarani', nome_curto: 'GUA', serie: 'C', cidade: 'Campinas', estado: 'SP', pais: 'Brasil', mascote: 'Bugre' },
  { api_id: 1048, nome: 'Inter de Limeira', nome_curto: 'ITL', serie: 'C', cidade: 'Limeira', estado: 'SP', pais: 'Brasil', mascote: 'Leão' },
  { api_id: 11045, nome: 'Itabaiana', nome_curto: 'ITA', serie: 'C', cidade: 'Itabaiana', estado: 'SE', pais: 'Brasil', mascote: 'Tremendão' },
  { api_id: 1045, nome: 'Ituano', nome_curto: 'ITU', serie: 'C', cidade: 'Itu', estado: 'SP', pais: 'Brasil', mascote: 'Galo de Itu' },
  { api_id: 10101, nome: 'Maranhão', nome_curto: 'MAC', serie: 'C', cidade: 'São Luís', estado: 'MA', pais: 'Brasil', mascote: 'Peixe-Boi' },
  { api_id: 10081, nome: 'Maringá', nome_curto: 'MGA', serie: 'C', cidade: 'Maringá', estado: 'PR', pais: 'Brasil', mascote: 'Dogão' },
  { api_id: 146, nome: 'Paysandu', nome_curto: 'PAY', serie: 'C', cidade: 'Belém', estado: 'PA', pais: 'Brasil', mascote: 'Papão' },
  { api_id: 753, nome: 'Santa Cruz', nome_curto: 'STC', serie: 'C', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Cobra Coral' },
  { api_id: 1010, nome: 'Volta Redonda', nome_curto: 'VRE', serie: 'C', cidade: 'Volta Redonda', estado: 'RJ', pais: 'Brasil', mascote: 'Voltaço' },
  { api_id: 1013, nome: 'Ypiranga-RS', nome_curto: 'YPI', serie: 'C', cidade: 'Erechim', estado: 'RS', pais: 'Brasil', mascote: 'Canarinho' },

  // ═══════════════════════════════════════════════════════════
  // SÉRIE D 2026 (DESTAQUES)
  // ═══════════════════════════════════════════════════════════
  { api_id: 7315, nome: 'ABC', nome_curto: 'ABC', serie: 'D', cidade: 'Natal', estado: 'RN', pais: 'Brasil', mascote: 'Elefante' },
  { api_id: 11028, nome: 'ABECAT', nome_curto: 'ABE', serie: 'D', cidade: 'Aparecida de Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Gato' },
  { api_id: 2542, nome: 'Água Santa', nome_curto: 'AGU', serie: 'D', cidade: 'Diadema', estado: 'SP', pais: 'Brasil', mascote: 'Netuno' },
  { api_id: 10103, nome: 'Águia de Marabá', nome_curto: 'AGM', serie: 'D', cidade: 'Marabá', estado: 'PA', pais: 'Brasil', mascote: 'Águia' },
  { api_id: 11043, nome: 'Altos', nome_curto: 'ALT', serie: 'D', cidade: 'Altos', estado: 'PI', pais: 'Brasil', mascote: 'Jacaré' },
  { api_id: 11049, nome: 'America-RJ', nome_curto: 'ARJ', serie: 'D', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Diabinho' },
  { api_id: 10104, nome: 'América-RN', nome_curto: 'ARN', serie: 'D', cidade: 'Natal', estado: 'RN', pais: 'Brasil', mascote: 'Mecão' },
  { api_id: 1064, nome: 'Aparecidense', nome_curto: 'APA', serie: 'D', cidade: 'Aparecida de Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Camaleão' },
  { api_id: 11050, nome: 'Araguaína', nome_curto: 'ARA', serie: 'D', cidade: 'Araguaína', estado: 'TO', pais: 'Brasil', mascote: 'Cachorro-do-Mato' },
  { api_id: 11046, nome: 'ASA', nome_curto: 'ASA', serie: 'D', cidade: 'Arapiraca', estado: 'AL', pais: 'Brasil', mascote: 'Fantasma' },
  { api_id: 11027, nome: 'CRAC', nome_curto: 'CRA', serie: 'D', cidade: 'Catalão', estado: 'GO', pais: 'Brasil', mascote: 'Leão do Sul' },
  { api_id: 10105, nome: 'CSA', nome_curto: 'CSA', serie: 'D', cidade: 'Maceió', estado: 'AL', pais: 'Brasil', mascote: 'Azulão' },
  { api_id: 10072, nome: 'Gama', nome_curto: 'GAM', serie: 'D', cidade: 'Brasília', estado: 'DF', pais: 'Brasil', mascote: 'Periquito' },
  { api_id: 11058, nome: 'Goiatuba', nome_curto: 'GTB', serie: 'D', cidade: 'Goiatuba', estado: 'GO', pais: 'Brasil', mascote: 'Galo' },
  { api_id: 11022, nome: 'Inhumas', nome_curto: 'INH', serie: 'D', cidade: 'Inhumas', estado: 'GO', pais: 'Brasil', mascote: 'Trovão Azul' },
  { api_id: 11086, nome: 'Iporá', nome_curto: 'IPO', serie: 'D', cidade: 'Iporá', estado: 'GO', pais: 'Brasil', mascote: 'Lobo-Guará' },
  { api_id: 11069, nome: 'Retrô', nome_curto: 'RET', serie: 'D', cidade: 'Camaragibe', estado: 'PE', pais: 'Brasil', mascote: 'Coruja' },
  { api_id: 11071, nome: 'Tombense', nome_curto: 'TOM', serie: 'D', cidade: 'Tombos', estado: 'MG', pais: 'Brasil', mascote: 'Gavião-Carcará' },
  { api_id: 11072, nome: 'XV de Piracicaba', nome_curto: 'XVP', serie: 'D', cidade: 'Piracicaba', estado: 'SP', pais: 'Brasil', mascote: 'Nhô Quim' },

  // ═══════════════════════════════════════════════════════════
  // INTERNACIONAL - EUROPA (50 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { api_id: 541, nome: 'Real Madrid', nome_curto: 'RMA', serie: 'EUR', cidade: 'Madrid', estado: 'Comunidad de Madrid', pais: 'Espanha', mascote: 'Los Blancos' },
  { api_id: 529, nome: 'Barcelona', nome_curto: 'BAR', serie: 'EUR', cidade: 'Barcelona', estado: 'Catalunha', pais: 'Espanha', mascote: 'Blaugrana' },
  { api_id: 50, nome: 'Manchester City', nome_curto: 'MCI', serie: 'EUR', cidade: 'Manchester', estado: 'England', pais: 'Inglaterra', mascote: 'Moonbeam & Moonchester' },
  { api_id: 40, nome: 'Liverpool', nome_curto: 'LIV', serie: 'EUR', cidade: 'Liverpool', estado: 'England', pais: 'Inglaterra', mascote: 'Mighty Red' },
  { api_id: 157, nome: 'Bayern Munich', nome_curto: 'BAY', serie: 'EUR', cidade: 'Munique', estado: 'Baviera', pais: 'Alemanha', mascote: 'Berni' },
  { api_id: 33, nome: 'Manchester United', nome_curto: 'MUN', serie: 'EUR', cidade: 'Manchester', estado: 'England', pais: 'Inglaterra', mascote: 'Fred the Red' },
  { api_id: 496, nome: 'Juventus', nome_curto: 'JUV', serie: 'EUR', cidade: 'Turim', estado: 'Piemonte', pais: 'Itália', mascote: 'Zebra (Jay)' },
  { api_id: 85, nome: 'PSG', nome_curto: 'PSG', serie: 'EUR', cidade: 'Paris', estado: 'Île-de-France', pais: 'França', mascote: 'Germain le Lynx' },
  { api_id: 492, nome: 'Napoli', nome_curto: 'NAP', serie: 'EUR', cidade: 'Nápoles', estado: 'Campânia', pais: 'Itália', mascote: "O' Ciuccio (Burro)" },
  { api_id: 505, nome: 'Inter Milan', nome_curto: 'INT', serie: 'EUR', cidade: 'Milão', estado: 'Lombardia', pais: 'Itália', mascote: 'Biscione (Serpente)' },
  { api_id: 489, nome: 'AC Milan', nome_curto: 'ACM', serie: 'EUR', cidade: 'Milão', estado: 'Lombardia', pais: 'Itália', mascote: 'Diavolo (Diabo)' },
  { api_id: 34, nome: 'Newcastle', nome_curto: 'NEW', serie: 'EUR', cidade: 'Newcastle', estado: 'England', pais: 'Inglaterra', mascote: 'Magpie (Pega)' },
  { api_id: 42, nome: 'Arsenal', nome_curto: 'ARS', serie: 'EUR', cidade: 'Londres', estado: 'England', pais: 'Inglaterra', mascote: 'Gunnersaurus' },
  { api_id: 165, nome: 'Dortmund', nome_curto: 'BVB', serie: 'EUR', cidade: 'Dortmund', estado: 'Renânia do Norte-Vestfália', pais: 'Alemanha', mascote: 'Emma (Abelha)' },
  { api_id: 530, nome: 'Atletico Madrid', nome_curto: 'ATM', serie: 'EUR', cidade: 'Madrid', estado: 'Comunidad de Madrid', pais: 'Espanha', mascote: 'Indi' },
  { api_id: 197, nome: 'Benfica', nome_curto: 'SLB', serie: 'EUR', cidade: 'Lisboa', estado: 'Lisboa', pais: 'Portugal', mascote: 'Águia Vitória' },
  { api_id: 211, nome: 'FC Porto', nome_curto: 'FCP', serie: 'EUR', cidade: 'Porto', estado: 'Porto', pais: 'Portugal', mascote: 'Draco (Dragão)' },
  { api_id: 173, nome: 'RB Leipzig', nome_curto: 'RBL', serie: 'EUR', cidade: 'Leipzig', estado: 'Saxônia', pais: 'Alemanha', mascote: 'Bulli' },
  { api_id: 168, nome: 'Bayer Leverkusen', nome_curto: 'B04', serie: 'EUR', cidade: 'Leverkusen', estado: 'Renânia do Norte-Vestfália', pais: 'Alemanha', mascote: 'Brian the Lion' },
  { api_id: 611, nome: 'Ajax', nome_curto: 'AJX', serie: 'EUR', cidade: 'Amsterdã', estado: 'Holanda do Norte', pais: 'Holanda', mascote: 'Lucky Lynx' },
  { api_id: 47, nome: 'Tottenham', nome_curto: 'TOT', serie: 'EUR', cidade: 'Londres', estado: 'England', pais: 'Inglaterra', mascote: 'Chirpy (Galo)' },
  { api_id: 49, nome: 'Chelsea', nome_curto: 'CHE', serie: 'EUR', cidade: 'Londres', estado: 'England', pais: 'Inglaterra', mascote: 'Stamford the Lion' },
  { api_id: 521, nome: 'AS Roma', nome_curto: 'ROM', serie: 'EUR', cidade: 'Roma', estado: 'Lácio', pais: 'Itália', mascote: 'Lupa (Loba)' },
  { api_id: 497, nome: 'Lazio', nome_curto: 'LAZ', serie: 'EUR', cidade: 'Roma', estado: 'Lácio', pais: 'Itália', mascote: 'Águia Olimpia' },
  { api_id: 502, nome: 'Fiorentina', nome_curto: 'FIO', serie: 'EUR', cidade: 'Florença', estado: 'Toscana', pais: 'Itália', mascote: 'Viola (Lírio)' },
  { api_id: 499, nome: 'Atalanta', nome_curto: 'ATA', serie: 'EUR', cidade: 'Bérgamo', estado: 'Lombardia', pais: 'Itália', mascote: 'La Dea (A Deusa)' },
  { api_id: 536, nome: 'Sevilla', nome_curto: 'SEV', serie: 'EUR', cidade: 'Sevilha', estado: 'Andaluzia', pais: 'Espanha', mascote: 'SFC (El Gran Capitán)' },
  { api_id: 540, nome: 'Villarreal', nome_curto: 'VIL', serie: 'EUR', cidade: 'Vila-real', estado: 'Comunidade Valenciana', pais: 'Espanha', mascote: 'Submarino Amarelo' },
  { api_id: 532, nome: 'Valencia', nome_curto: 'VAL', serie: 'EUR', cidade: 'Valência', estado: 'Comunidade Valenciana', pais: 'Espanha', mascote: 'Morcego (Bat)' },
  { api_id: 531, nome: 'Athletic Bilbao', nome_curto: 'ATH', serie: 'EUR', cidade: 'Bilbao', estado: 'País Basco', pais: 'Espanha', mascote: 'Los Leones' },
  { api_id: 161, nome: 'Wolfsburg', nome_curto: 'WOL', serie: 'EUR', cidade: 'Wolfsburg', estado: 'Baixa Saxônia', pais: 'Alemanha', mascote: 'Wölfi (Lobinho)' },
  { api_id: 159, nome: 'Hertha Berlin', nome_curto: 'BSC', serie: 'EUR', cidade: 'Berlim', estado: 'Berlim', pais: 'Alemanha', mascote: 'Hertinho (Urso)' },
  { api_id: 81, nome: 'Marseille', nome_curto: 'OM', serie: 'EUR', cidade: 'Marselha', estado: 'Provença', pais: 'França', mascote: 'Droit au But' },
  { api_id: 79, nome: 'Lille', nome_curto: 'LOSC', serie: 'EUR', cidade: 'Lille', estado: 'Hauts-de-France', pais: 'França', mascote: 'Dogue (Dogão)' },
  { api_id: 91, nome: 'Monaco', nome_curto: 'ASM', serie: 'EUR', cidade: 'Mônaco', estado: 'Mônaco', pais: 'Mônaco', mascote: 'Hércules' },
  { api_id: 94, nome: 'Rennes', nome_curto: 'REN', serie: 'EUR', cidade: 'Rennes', estado: 'Bretanha', pais: 'França', mascote: 'Herminig (Arminho)' },
  { api_id: 212, nome: 'Sporting CP', nome_curto: 'SCP', serie: 'EUR', cidade: 'Lisboa', estado: 'Lisboa', pais: 'Portugal', mascote: 'Leão' },
  { api_id: 210, nome: 'Braga', nome_curto: 'SCB', serie: 'EUR', cidade: 'Braga', estado: 'Braga', pais: 'Portugal', mascote: 'Arsenalista' },
  { api_id: 194, nome: 'Feyenoord', nome_curto: 'FEY', serie: 'EUR', cidade: 'Roterdã', estado: 'Holanda do Sul', pais: 'Holanda', mascote: 'Cockrobin' },
  { api_id: 195, nome: 'PSV Eindhoven', nome_curto: 'PSV', serie: 'EUR', cidade: 'Eindhoven', estado: 'Brabante do Norte', pais: 'Holanda', mascote: 'Phoxy' },
  { api_id: 247, nome: 'Celtic', nome_curto: 'CEL', serie: 'EUR', cidade: 'Glasgow', estado: 'Scotland', pais: 'Escócia', mascote: 'Hoopy the Huddle Hound' },
  { api_id: 252, nome: 'Rangers', nome_curto: 'RAN', serie: 'EUR', cidade: 'Glasgow', estado: 'Scotland', pais: 'Escócia', mascote: 'Broxi Bear' },
  { api_id: 328, nome: 'Galatasaray', nome_curto: 'GAL', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Aslan (Leão)' },
  { api_id: 327, nome: 'Fenerbahce', nome_curto: 'FEN', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Canário' },
  { api_id: 329, nome: 'Besiktas', nome_curto: 'BES', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Kara Kartal (Águia Negra)' },
  { api_id: 550, nome: 'Shakhtar Donetsk', nome_curto: 'SHA', serie: 'EUR', cidade: 'Donetsk', estado: 'Donetsk', pais: 'Ucrânia', mascote: 'Minerador' },
  { api_id: 551, nome: 'Dynamo Kyiv', nome_curto: 'DKV', serie: 'EUR', cidade: 'Kiev', estado: 'Kiev', pais: 'Ucrânia', mascote: 'Leão Branco' },
  { api_id: 231, nome: 'Olympiakos', nome_curto: 'OLY', serie: 'EUR', cidade: 'Pireu', estado: 'Ática', pais: 'Grécia', mascote: 'Thrylos (Lenda)' },
  { api_id: 232, nome: 'Panathinaikos', nome_curto: 'PAN', serie: 'EUR', cidade: 'Atenas', estado: 'Ática', pais: 'Grécia', mascote: 'Trevo' },
  { api_id: 234, nome: 'PAOK', nome_curto: 'PAO', serie: 'EUR', cidade: 'Salônica', estado: 'Macedônia Central', pais: 'Grécia', mascote: 'Águia Bicéfala' },

  // ═══════════════════════════════════════════════════════════
  // INTERNACIONAL - AMÉRICA DO SUL (30 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { api_id: 441, nome: 'Boca Juniors', nome_curto: 'BOC', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Xeneize' },
  { api_id: 442, nome: 'River Plate', nome_curto: 'RIV', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Millonario' },
  { api_id: 268, nome: 'Peñarol', nome_curto: 'PEN', serie: 'INT', cidade: 'Montevidéu', estado: 'Montevidéu', pais: 'Uruguai', mascote: 'Manya' },
  { api_id: 272, nome: 'Olimpia', nome_curto: 'OLI', serie: 'INT', cidade: 'Assunção', estado: 'Central', pais: 'Paraguai', mascote: 'Decano' },
  { api_id: 451, nome: 'Atlético Nacional', nome_curto: 'ATN', serie: 'INT', cidade: 'Medellín', estado: 'Antioquia', pais: 'Colômbia', mascote: 'Verdolaga' },
  { api_id: 273, nome: 'Libertad', nome_curto: 'LIB', serie: 'INT', cidade: 'Assunção', estado: 'Central', pais: 'Paraguai', mascote: 'Gumarelo' },
  { api_id: 445, nome: 'Racing Club', nome_curto: 'RAC', serie: 'INT', cidade: 'Avellaneda', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'La Academia' },
  { api_id: 449, nome: 'Independiente', nome_curto: 'IND', serie: 'INT', cidade: 'Avellaneda', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Rojo (Diabo Vermelho)' },
  { api_id: 269, nome: 'Nacional-URU', nome_curto: 'NAC', serie: 'INT', cidade: 'Montevidéu', estado: 'Montevidéu', pais: 'Uruguai', mascote: 'Bolso' },
  { api_id: 450, nome: 'San Lorenzo', nome_curto: 'SLO', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Ciclón' },
  { api_id: 455, nome: 'Colo-Colo', nome_curto: 'CC', serie: 'INT', cidade: 'Santiago', estado: 'Região Metropolitana', pais: 'Chile', mascote: 'Cacique' },
  { api_id: 1121, nome: 'Ind. del Valle', nome_curto: 'IDV', serie: 'INT', cidade: 'Sangolquí', estado: 'Pichincha', pais: 'Equador', mascote: 'Rayado' },
  { api_id: 1122, nome: 'LDU Quito', nome_curto: 'LDU', serie: 'INT', cidade: 'Quito', estado: 'Pichincha', pais: 'Equador', mascote: 'Rey de Copas' },
  { api_id: 1123, nome: 'Barcelona-EQU', nome_curto: 'BSC', serie: 'INT', cidade: 'Guayaquil', estado: 'Guayas', pais: 'Equador', mascote: 'Torero' },
  { api_id: 1124, nome: 'Cerro Porteño', nome_curto: 'CCP', serie: 'INT', cidade: 'Assunção', estado: 'Central', pais: 'Paraguai', mascote: 'Ciclón' },
  { api_id: 1125, nome: 'Estudiantes', nome_curto: 'EST', serie: 'INT', cidade: 'La Plata', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Pincha' },
  { api_id: 1126, nome: 'Vélez Sarsfield', nome_curto: 'VEL', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Fortín' },
  { api_id: 1127, nome: 'U. de Chile', nome_curto: 'UCH', serie: 'INT', cidade: 'Santiago', estado: 'Região Metropolitana', pais: 'Chile', mascote: 'Chuncho (Coruja)' },
  { api_id: 1128, nome: 'U. Católica', nome_curto: 'UCA', serie: 'INT', cidade: 'Santiago', estado: 'Região Metropolitana', pais: 'Chile', mascote: 'Cruzado' },
  { api_id: 1129, nome: 'Alianza Lima', nome_curto: 'ALI', serie: 'INT', cidade: 'Lima', estado: 'Lima', pais: 'Peru', mascote: 'Gato' },
  { api_id: 1130, nome: 'Universitario', nome_curto: 'UNI', serie: 'INT', cidade: 'Lima', estado: 'Lima', pais: 'Peru', mascote: 'Crema' },
  { api_id: 1131, nome: 'Bolívar', nome_curto: 'BOL', serie: 'INT', cidade: 'La Paz', estado: 'La Paz', pais: 'Bolívia', mascote: 'Academia' },
  { api_id: 1132, nome: 'The Strongest', nome_curto: 'STR', serie: 'INT', cidade: 'La Paz', estado: 'La Paz', pais: 'Bolívia', mascote: 'Tigre' },
  { api_id: 1133, nome: 'Millonarios', nome_curto: 'MIL', serie: 'INT', cidade: 'Bogotá', estado: 'Cundinamarca', pais: 'Colômbia', mascote: 'Embajador' },
  { api_id: 1134, nome: 'Junior Barranquilla', nome_curto: 'JUN', serie: 'INT', cidade: 'Barranquilla', estado: 'Atlántico', pais: 'Colômbia', mascote: 'Tiburón' },
  { api_id: 1135, nome: 'Caracas FC', nome_curto: 'CFC', serie: 'INT', cidade: 'Caracas', estado: 'Distrito Capital', pais: 'Venezuela', mascote: 'Rojo' },
  { api_id: 1136, nome: 'Dep. Táchira', nome_curto: 'TAC', serie: 'INT', cidade: 'San Cristóbal', estado: 'Táchira', pais: 'Venezuela', mascote: 'Aurinegro' },
  { api_id: 1137, nome: 'Melgar', nome_curto: 'MEL', serie: 'INT', cidade: 'Arequipa', estado: 'Arequipa', pais: 'Peru', mascote: 'Dominó' },
  { api_id: 1138, nome: 'Defensor Sporting', nome_curto: 'DEF', serie: 'INT', cidade: 'Montevidéu', estado: 'Montevidéu', pais: 'Uruguai', mascote: 'Violeta' },
  { api_id: 1139, nome: 'Emelec', nome_curto: 'EME', serie: 'INT', cidade: 'Guayaquil', estado: 'Guayas', pais: 'Equador', mascote: 'Eléctrico' },
];

/** Lista mestra com logoUrl já resolvido — fonte ÚNICA de verdade */
export const CLUBS_DATA: ClubData[] = RAW_CLUBS.map((c) => ({
  ...c,
  logoUrl: buildLogo(c.nome, c.api_id),
}));
