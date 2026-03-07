/* Caminho: src/clubes-data.ts
   Lista Mestra Unificada Heart Club 2026 — COMPLETA E FINAL
   Campos: nome, nome_curto, serie, cidade, estado, pais, mascote, slug, logo
   Cada 'logo' bate EXATAMENTE com o arquivo em public/logos/
*/

export interface ClubData {
  nome: string;
  nome_curto: string;
  serie: string;
  cidade: string;
  estado: string;
  pais: string;
  mascote: string;
  slug: string;
  logo: string;
}

/** Gera slug único: nome-cidade-estado-pais (sem acentos, lowercase, hifenizado) */
export const generateSlug = (nome: string, cidade: string, estado: string, pais: string): string => {
  const raw = `${nome}-${cidade}-${estado}-${pais}`;
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

export const CLUBS_DATA: ClubData[] = [
  // ═══════════════════════════════════════════════════════════
  // SÉRIE A 2026 (20 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'Athletico-PR', nome_curto: 'CAP', serie: 'A', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil', mascote: 'Furacão', slug: 'athletico-pr-curitiba-pr-brasil', logo: '/logos/athletico-pr-curitiba-pr-brasil.png' },
  { nome: 'Atlético-MG', nome_curto: 'CAM', serie: 'A', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', mascote: 'Galo', slug: 'atletico-mg-belo-horizonte-mg-brasil', logo: '/logos/atletico-mg-belo-horizonte-mg-brasil.png' },
  { nome: 'Bahia', nome_curto: 'BAH', serie: 'A', cidade: 'Salvador', estado: 'BA', pais: 'Brasil', mascote: 'Super-Homem (Tricolor de Aço)', slug: 'bahia-salvador-ba-brasil', logo: '/logos/bahia-salvador-ba-brasil.png' },
  { nome: 'Botafogo', nome_curto: 'BOT', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Manequinho', slug: 'botafogo-rio-de-janeiro-rj-brasil', logo: '/logos/botafogo-rio-de-janeiro-rj-brasil.png' },
  { nome: 'Chapecoense', nome_curto: 'CHA', serie: 'A', cidade: 'Chapecó', estado: 'SC', pais: 'Brasil', mascote: 'Índio Condá', slug: 'chapecoense-chapeco-sc-brasil', logo: '/logos/chapecoense-chapeco-sc-brasil.png' },
  { nome: 'Corinthians', nome_curto: 'COR', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Mosqueteiro', slug: 'corinthians-sao-paulo-sp-brasil', logo: '/logos/corinthians-sao-paulo-sp-brasil.png' },
  { nome: 'Coritiba', nome_curto: 'CFC', serie: 'A', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil', mascote: 'Vovô Coxa', slug: 'coritiba-curitiba-pr-brasil', logo: '/logos/coritiba-curitiba-pr-brasil.png' },
  { nome: 'Cruzeiro', nome_curto: 'CRU', serie: 'A', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', mascote: 'Raposa', slug: 'cruzeiro-belo-horizonte-mg-brasil', logo: '/logos/cruzeiro-belo-horizonte-mg-brasil.png' },
  { nome: 'Flamengo', nome_curto: 'FLA', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Urubu', slug: 'flamengo-rio-de-janeiro-rj-brasil', logo: '/logos/flamengo-rio-de-janeiro-rj-brasil.png' },
  { nome: 'Fluminense', nome_curto: 'FLU', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Guerreiro Tricolor', slug: 'fluminense-rio-de-janeiro-rj-brasil', logo: '/logos/fluminense-rio-de-janeiro-rj-brasil.png' },
  { nome: 'Grêmio', nome_curto: 'GRE', serie: 'A', cidade: 'Porto Alegre', estado: 'RS', pais: 'Brasil', mascote: 'Mosqueteiro', slug: 'gremio-porto-alegre-rs-brasil', logo: '/logos/gremio-porto-alegre-rs-brasil.png' },
  { nome: 'Internacional', nome_curto: 'INT', serie: 'A', cidade: 'Porto Alegre', estado: 'RS', pais: 'Brasil', mascote: 'Saci', slug: 'internacional-porto-alegre-rs-brasil', logo: '/logos/internacional-porto-alegre-rs-brasil.png' },
  { nome: 'Mirassol', nome_curto: 'MIR', serie: 'A', cidade: 'Mirassol', estado: 'SP', pais: 'Brasil', mascote: 'Leão', slug: 'mirassol-mirassol-sp-brasil', logo: '/logos/mirassol-mirassol-sp-brasil.png' },
  { nome: 'Palmeiras', nome_curto: 'PAL', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Periquito', slug: 'palmeiras-sao-paulo-sp-brasil', logo: '/logos/palmeiras-sao-paulo-sp-brasil.png' },
  { nome: 'Bragantino', nome_curto: 'BGT', serie: 'A', cidade: 'Bragança Paulista', estado: 'SP', pais: 'Brasil', mascote: 'Massa Bruta', slug: 'bragantino-braganca-paulista-sp-brasil', logo: '/logos/bragantino-braganca-paulista-sp-brasil.png' },
  { nome: 'Remo', nome_curto: 'REM', serie: 'A', cidade: 'Belém', estado: 'PA', pais: 'Brasil', mascote: 'Leão Azul', slug: 'remo-belem-pa-brasil', logo: '/logos/remo-belem-pa-brasil.png' },
  { nome: 'Santos', nome_curto: 'SAN', serie: 'A', cidade: 'Santos', estado: 'SP', pais: 'Brasil', mascote: 'Baleia', slug: 'santos-santos-sp-brasil', logo: '/logos/santos-santos-sp-brasil.png' },
  { nome: 'São Paulo', nome_curto: 'SAO', serie: 'A', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', mascote: 'Santo Paulo', slug: 'sao-paulo-sao-paulo-sp-brasil', logo: '/logos/sao-paulo-sao-paulo-sp-brasil.png' },
  { nome: 'Vasco', nome_curto: 'VAS', serie: 'A', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Almirante', slug: 'vasco-rio-de-janeiro-rj-brasil', logo: '/logos/vasco-rio-de-janeiro-rj-brasil.png' },
  { nome: 'Vitória', nome_curto: 'VIT', serie: 'A', cidade: 'Salvador', estado: 'BA', pais: 'Brasil', mascote: 'Leão', slug: 'vitoria-salvador-ba-brasil', logo: '/logos/vitoria-salvador-ba-brasil.png' },

  // ═══════════════════════════════════════════════════════════
  // SÉRIE B 2026 (20 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'América-MG', nome_curto: 'AMG', serie: 'B', cidade: 'Belo Horizonte', estado: 'MG', pais: 'Brasil', mascote: 'Coelho', slug: 'america-mg-belo-horizonte-mg-brasil', logo: '/logos/america-mg-belo-horizonte-mg-brasil.png' },
  { nome: 'Athletic Club', nome_curto: 'ATH', serie: 'B', cidade: 'São João del-Rei', estado: 'MG', pais: 'Brasil', mascote: 'Esquilo', slug: 'athletic-club-sao-joao-del-rei-mg-brasil', logo: '/logos/athletic-club-sao-joao-del-rei-mg-brasil.png' },
  { nome: 'Atlético-GO', nome_curto: 'ACG', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Dragão', slug: 'atletico-go-goiania-go-brasil', logo: '/logos/atletico-go-goiania-go-brasil.png' },
  { nome: 'Avaí', nome_curto: 'AVA', serie: 'B', cidade: 'Florianópolis', estado: 'SC', pais: 'Brasil', mascote: 'Leão da Ilha', slug: 'avai-florianopolis-sc-brasil', logo: '/logos/avai-florianopolis-sc-brasil.png' },
  { nome: 'Botafogo-SP', nome_curto: 'BSP', serie: 'B', cidade: 'Ribeirão Preto', estado: 'SP', pais: 'Brasil', mascote: 'Pantera', slug: 'botafogo-sp-ribeirao-preto-sp-brasil', logo: '/logos/botafogo-sp-ribeirao-preto-sp-brasil.png' },
  { nome: 'Ceará', nome_curto: 'CEA', serie: 'B', cidade: 'Fortaleza', estado: 'CE', pais: 'Brasil', mascote: 'Vozão', slug: 'ceara-fortaleza-ce-brasil', logo: '/logos/ceara-fortaleza-ce-brasil.png' },
  { nome: 'CRB', nome_curto: 'CRB', serie: 'B', cidade: 'Maceió', estado: 'AL', pais: 'Brasil', mascote: 'Galo', slug: 'crb-maceio-al-brasil', logo: '/logos/crb-maceio-al-brasil.png' },
  { nome: 'Criciúma', nome_curto: 'CRI', serie: 'B', cidade: 'Criciúma', estado: 'SC', pais: 'Brasil', mascote: 'Tigre', slug: 'criciuma-criciuma-sc-brasil', logo: '/logos/criciuma-criciuma-sc-brasil.png' },
  { nome: 'Cuiabá', nome_curto: 'CUI', serie: 'B', cidade: 'Cuiabá', estado: 'MT', pais: 'Brasil', mascote: 'Dourado', slug: 'cuiaba-cuiaba-mt-brasil', logo: '/logos/cuiaba-cuiaba-mt-brasil.png' },
  { nome: 'Fortaleza', nome_curto: 'FOR', serie: 'B', cidade: 'Fortaleza', estado: 'CE', pais: 'Brasil', mascote: 'Leão do Pici', slug: 'fortaleza-fortaleza-ce-brasil', logo: '/logos/fortaleza-fortaleza-ce-brasil.png' },
  { nome: 'Goiás', nome_curto: 'GOI', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Periquito', slug: 'goias-goiania-go-brasil', logo: '/logos/goias-goiania-go-brasil.png' },
  { nome: 'Juventude', nome_curto: 'JUV', serie: 'B', cidade: 'Caxias do Sul', estado: 'RS', pais: 'Brasil', mascote: 'Papo', slug: 'juventude-caxias-do-sul-rs-brasil', logo: '/logos/juventude-caxias-do-sul-rs-brasil.png' },
  { nome: 'Londrina', nome_curto: 'LON', serie: 'B', cidade: 'Londrina', estado: 'PR', pais: 'Brasil', mascote: 'Tubarão', slug: 'londrina-londrina-pr-brasil', logo: '/logos/londrina-londrina-pr-brasil.png' },
  { nome: 'Náutico', nome_curto: 'NAU', serie: 'B', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Timbu', slug: 'nautico-recife-pe-brasil', logo: '/logos/nautico-recife-pe-brasil.png' },
  { nome: 'Novorizontino', nome_curto: 'NOV', serie: 'B', cidade: 'Novo Horizonte', estado: 'SP', pais: 'Brasil', mascote: 'Tigre', slug: 'novorizontino-novo-horizonte-sp-brasil', logo: '/logos/novorizontino-novo-horizonte-sp-brasil.png' },
  { nome: 'Operário-PR', nome_curto: 'OPE', serie: 'B', cidade: 'Ponta Grossa', estado: 'PR', pais: 'Brasil', mascote: 'Fantasma', slug: 'operario-pr-ponta-grossa-pr-brasil', logo: '/logos/operario-pr-ponta-grossa-pr-brasil.png' },
  { nome: 'Ponte Preta', nome_curto: 'PON', serie: 'B', cidade: 'Campinas', estado: 'SP', pais: 'Brasil', mascote: 'Macaca', slug: 'ponte-preta-campinas-sp-brasil', logo: '/logos/ponte-preta-campinas-sp-brasil.png' },
  { nome: 'São Bernardo', nome_curto: 'SBE', serie: 'B', cidade: 'São Bernardo do Campo', estado: 'SP', pais: 'Brasil', mascote: 'Tigre', slug: 'sao-bernardo-sao-bernardo-do-campo-sp-brasil', logo: '/logos/sao-bernardo-sao-bernardo-do-campo-sp-brasil.png' },
  { nome: 'Sport', nome_curto: 'SPT', serie: 'B', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Leão', slug: 'sport-recife-pe-brasil', logo: '/logos/sport-recife-pe-brasil.png' },
  { nome: 'Vila Nova', nome_curto: 'VIL', serie: 'B', cidade: 'Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Tigre', slug: 'vila-nova-goiania-go-brasil', logo: '/logos/vila-nova-goiania-go-brasil.png' },

  // ═══════════════════════════════════════════════════════════
  // SÉRIE C 2026 (20 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'Amazonas FC', nome_curto: 'AMA', serie: 'C', cidade: 'Manaus', estado: 'AM', pais: 'Brasil', mascote: 'Onça-Pintada', slug: 'amazonas-fc-manaus-am-brasil', logo: '/logos/amazonas-fc-manaus-am-brasil.png' },
  { nome: 'Anápolis', nome_curto: 'ANA', serie: 'C', cidade: 'Anápolis', estado: 'GO', pais: 'Brasil', mascote: 'Xavante', slug: 'anapolis-anapolis-go-brasil', logo: '/logos/anapolis-anapolis-go-brasil.png' },
  { nome: 'Barra-SC', nome_curto: 'BAR', serie: 'C', cidade: 'Balneário Camboriú', estado: 'SC', pais: 'Brasil', mascote: 'Leão', slug: 'barra-sc-balneario-camboriu-sc-brasil', logo: '/logos/barra-sc-balneario-camboriu-sc-brasil.png' },
  { nome: 'Botafogo-PB', nome_curto: 'BPB', serie: 'C', cidade: 'João Pessoa', estado: 'PB', pais: 'Brasil', mascote: 'Belo', slug: 'botafogo-pb-joao-pessoa-pb-brasil', logo: '/logos/botafogo-pb-joao-pessoa-pb-brasil.png' },
  { nome: 'Brusque', nome_curto: 'BRU', serie: 'C', cidade: 'Brusque', estado: 'SC', pais: 'Brasil', mascote: 'Marreco', slug: 'brusque-brusque-sc-brasil', logo: '/logos/brusque-brusque-sc-brasil.png' },
  { nome: 'Caxias', nome_curto: 'CAX', serie: 'C', cidade: 'Caxias do Sul', estado: 'RS', pais: 'Brasil', mascote: 'Grená', slug: 'caxias-caxias-do-sul-rs-brasil', logo: '/logos/caxias-caxias-do-sul-rs-brasil.png' },
  { nome: 'Confiança', nome_curto: 'CON', serie: 'C', cidade: 'Aracaju', estado: 'SE', pais: 'Brasil', mascote: 'Dragão', slug: 'confianca-aracaju-se-brasil', logo: '/logos/confianca-aracaju-se-brasil.png' },
  { nome: 'Ferroviária', nome_curto: 'AFE', serie: 'C', cidade: 'Araraquara', estado: 'SP', pais: 'Brasil', mascote: 'Locomotiva', slug: 'ferroviaria-araraquara-sp-brasil', logo: '/logos/ferroviaria-araraquara-sp-brasil.png' },
  { nome: 'Figueirense', nome_curto: 'FIG', serie: 'C', cidade: 'Florianópolis', estado: 'SC', pais: 'Brasil', mascote: 'Figueira', slug: 'figueirense-florianopolis-sc-brasil', logo: '/logos/figueirense-florianopolis-sc-brasil.png' },
  { nome: 'Floresta', nome_curto: 'FLO', serie: 'C', cidade: 'Fortaleza', estado: 'CE', pais: 'Brasil', mascote: 'Lobo', slug: 'floresta-fortaleza-ce-brasil', logo: '/logos/floresta-fortaleza-ce-brasil.png' },
  { nome: 'Guarani', nome_curto: 'GUA', serie: 'C', cidade: 'Campinas', estado: 'SP', pais: 'Brasil', mascote: 'Bugre', slug: 'guarani-campinas-sp-brasil', logo: '/logos/guarani-campinas-sp-brasil.png' },
  { nome: 'Inter de Limeira', nome_curto: 'ITL', serie: 'C', cidade: 'Limeira', estado: 'SP', pais: 'Brasil', mascote: 'Leão', slug: 'inter-de-limeira-limeira-sp-brasil', logo: '/logos/inter-de-limeira-limeira-sp-brasil.png' },
  { nome: 'Itabaiana', nome_curto: 'ITA', serie: 'C', cidade: 'Itabaiana', estado: 'SE', pais: 'Brasil', mascote: 'Tremendão', slug: 'itabaiana-itabaiana-se-brasil', logo: '/logos/itabaiana-itabaiana-se-brasil.png' },
  { nome: 'Ituano', nome_curto: 'ITU', serie: 'C', cidade: 'Itu', estado: 'SP', pais: 'Brasil', mascote: 'Galo de Itu', slug: 'ituano-itu-sp-brasil', logo: '/logos/ituano-itu-sp-brasil.png' },
  { nome: 'Maranhão', nome_curto: 'MAC', serie: 'C', cidade: 'São Luís', estado: 'MA', pais: 'Brasil', mascote: 'Peixe-Boi', slug: 'maranhao-sao-luis-ma-brasil', logo: '/logos/maranhao-sao-luis-ma-brasil.png' },
  { nome: 'Maringá', nome_curto: 'MGA', serie: 'C', cidade: 'Maringá', estado: 'PR', pais: 'Brasil', mascote: 'Dogão', slug: 'maringa-maringa-pr-brasil', logo: '/logos/maringa-maringa-pr-brasil.png' },
  { nome: 'Paysandu', nome_curto: 'PAY', serie: 'C', cidade: 'Belém', estado: 'PA', pais: 'Brasil', mascote: 'Papão', slug: 'paysandu-belem-pa-brasil', logo: '/logos/paysandu-belem-pa-brasil.png' },
  { nome: 'Santa Cruz', nome_curto: 'STC', serie: 'C', cidade: 'Recife', estado: 'PE', pais: 'Brasil', mascote: 'Cobra Coral', slug: 'santa-cruz-recife-pe-brasil', logo: '/logos/santa-cruz-recife-pe-brasil.png' },
  { nome: 'Volta Redonda', nome_curto: 'VRE', serie: 'C', cidade: 'Volta Redonda', estado: 'RJ', pais: 'Brasil', mascote: 'Voltaço', slug: 'volta-redonda-volta-redonda-rj-brasil', logo: '/logos/volta-redonda-volta-redonda-rj-brasil.png' },
  { nome: 'Ypiranga-RS', nome_curto: 'YPI', serie: 'C', cidade: 'Erechim', estado: 'RS', pais: 'Brasil', mascote: 'Canarinho', slug: 'ypiranga-rs-erechim-rs-brasil', logo: '/logos/ypiranga-rs-erechim-rs-brasil.png' },

  // ═══════════════════════════════════════════════════════════
  // SÉRIE D 2026 (DESTAQUES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'ABC', nome_curto: 'ABC', serie: 'D', cidade: 'Natal', estado: 'RN', pais: 'Brasil', mascote: 'Elefante', slug: 'abc-natal-rn-brasil', logo: '/logos/abc-natal-rn-brasil.png' },
  { nome: 'ABECAT', nome_curto: 'ABE', serie: 'D', cidade: 'Aparecida de Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Gato', slug: 'abecat-aparecida-de-goiania-go-brasil', logo: '/logos/abecat-aparecida-de-goiania-go-brasil.png' },
  { nome: 'Água Santa', nome_curto: 'AGU', serie: 'D', cidade: 'Diadema', estado: 'SP', pais: 'Brasil', mascote: 'Netuno', slug: 'agua-santa-diadema-sp-brasil', logo: '/logos/agua-santa-diadema-sp-brasil.png' },
  { nome: 'Águia de Marabá', nome_curto: 'AGM', serie: 'D', cidade: 'Marabá', estado: 'PA', pais: 'Brasil', mascote: 'Águia', slug: 'aguia-de-maraba-maraba-pa-brasil', logo: '/logos/aguia-de-maraba-maraba-pa-brasil.png' },
  { nome: 'Altos', nome_curto: 'ALT', serie: 'D', cidade: 'Altos', estado: 'PI', pais: 'Brasil', mascote: 'Jacaré', slug: 'altos-altos-pi-brasil', logo: '/logos/altos-altos-pi-brasil.png' },
  { nome: 'America-RJ', nome_curto: 'ARJ', serie: 'D', cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil', mascote: 'Diabinho', slug: 'america-rj-rio-de-janeiro-rj-brasil', logo: '/logos/america-rj-rio-de-janeiro-rj-brasil.png' },
  { nome: 'América-RN', nome_curto: 'ARN', serie: 'D', cidade: 'Natal', estado: 'RN', pais: 'Brasil', mascote: 'Mecão', slug: 'america-rn-natal-rn-brasil', logo: '/logos/america-rn-natal-rn-brasil.png' },
  { nome: 'Aparecidense', nome_curto: 'APA', serie: 'D', cidade: 'Aparecida de Goiânia', estado: 'GO', pais: 'Brasil', mascote: 'Camaleão', slug: 'aparecidense-aparecida-de-goiania-go-brasil', logo: '/logos/aparecidense-aparecida-de-goiania-go-brasil.png' },
  { nome: 'Araguaína', nome_curto: 'ARA', serie: 'D', cidade: 'Araguaína', estado: 'TO', pais: 'Brasil', mascote: 'Cachorro-do-Mato', slug: 'araguaina-araguaina-to-brasil', logo: '/logos/araguaina-araguaina-to-brasil.png' },
  { nome: 'ASA', nome_curto: 'ASA', serie: 'D', cidade: 'Arapiraca', estado: 'AL', pais: 'Brasil', mascote: 'Fantasma', slug: 'asa-arapiraca-al-brasil', logo: '/logos/asa-arapiraca-al-brasil.png' },
  { nome: 'CRAC', nome_curto: 'CRA', serie: 'D', cidade: 'Catalão', estado: 'GO', pais: 'Brasil', mascote: 'Leão do Sul', slug: 'crac-catalao-go-brasil', logo: '/logos/crac-catalao-go-brasil.png' },
  { nome: 'CSA', nome_curto: 'CSA', serie: 'D', cidade: 'Maceió', estado: 'AL', pais: 'Brasil', mascote: 'Azulão', slug: 'csa-maceio-al-brasil', logo: '/logos/csa-maceio-al-brasil.png' },
  { nome: 'Gama', nome_curto: 'GAM', serie: 'D', cidade: 'Brasília', estado: 'DF', pais: 'Brasil', mascote: 'Periquito', slug: 'gama-brasilia-df-brasil', logo: '/logos/gama-brasilia-df-brasil.png' },
  { nome: 'Goiatuba', nome_curto: 'GTB', serie: 'D', cidade: 'Goiatuba', estado: 'GO', pais: 'Brasil', mascote: 'Galo', slug: 'goiatuba-goiatuba-go-brasil', logo: '/logos/goiatuba-goiatuba-go-brasil.png' },
  { nome: 'Inhumas', nome_curto: 'INH', serie: 'D', cidade: 'Inhumas', estado: 'GO', pais: 'Brasil', mascote: 'Trovão Azul', slug: 'inhumas-inhumas-go-brasil', logo: '/logos/inhumas-inhumas-go-brasil.png' },
  { nome: 'Iporá', nome_curto: 'IPO', serie: 'D', cidade: 'Iporá', estado: 'GO', pais: 'Brasil', mascote: 'Lobo-Guará', slug: 'ipora-ipora-go-brasil', logo: '/logos/ipora-ipora-go-brasil.png' },
  { nome: 'Retrô', nome_curto: 'RET', serie: 'D', cidade: 'Camaragibe', estado: 'PE', pais: 'Brasil', mascote: 'Coruja', slug: 'retro-camaragibe-pe-brasil', logo: '/logos/retro-camaragibe-pe-brasil.png' },
  { nome: 'Tombense', nome_curto: 'TOM', serie: 'D', cidade: 'Tombos', estado: 'MG', pais: 'Brasil', mascote: 'Gavião-Carcará', slug: 'tombense-tombos-mg-brasil', logo: '/logos/tombense-tombos-mg-brasil.png' },
  { nome: 'XV de Piracicaba', nome_curto: 'XVP', serie: 'D', cidade: 'Piracicaba', estado: 'SP', pais: 'Brasil', mascote: 'Nhô Quim', slug: 'xv-de-piracicaba-piracicaba-sp-brasil', logo: '/logos/xv-de-piracicaba-piracicaba-sp-brasil.png' },

  // ═══════════════════════════════════════════════════════════
  // INTERNACIONAL - EUROPA (50 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'Real Madrid', nome_curto: 'RMA', serie: 'EUR', cidade: 'Madrid', estado: 'Comunidad de Madrid', pais: 'Espanha', mascote: 'Los Blancos', slug: 'real-madrid-madrid-comunidad-de-madrid-espanha', logo: '/logos/real-madrid-madrid-comunidad-de-madrid-espanha.png' },
  { nome: 'Barcelona', nome_curto: 'BAR', serie: 'EUR', cidade: 'Barcelona', estado: 'Catalunha', pais: 'Espanha', mascote: 'Blaugrana', slug: 'barcelona-barcelona-catalunha-espanha', logo: '/logos/barcelona-barcelona-catalunha-espanha.png' },
  { nome: 'Manchester City', nome_curto: 'MCI', serie: 'EUR', cidade: 'Manchester', estado: 'England', pais: 'Inglaterra', mascote: 'Moonbeam & Moonchester', slug: 'manchester-city-manchester-england-inglaterra', logo: '/logos/manchester-city-manchester-england-inglaterra.png' },
  { nome: 'Liverpool', nome_curto: 'LIV', serie: 'EUR', cidade: 'Liverpool', estado: 'England', pais: 'Inglaterra', mascote: 'Mighty Red', slug: 'liverpool-liverpool-england-inglaterra', logo: '/logos/liverpool-liverpool-england-inglaterra.png' },
  { nome: 'Bayern Munich', nome_curto: 'BAY', serie: 'EUR', cidade: 'Munique', estado: 'Baviera', pais: 'Alemanha', mascote: 'Berni', slug: 'bayern-munich-munique-baviera-alemanha', logo: '/logos/bayern-munich-munique-baviera-alemanha.png' },
  { nome: 'Manchester United', nome_curto: 'MUN', serie: 'EUR', cidade: 'Manchester', estado: 'England', pais: 'Inglaterra', mascote: 'Fred the Red', slug: 'manchester-united-manchester-england-inglaterra', logo: '/logos/manchester-united-manchester-england-inglaterra.png' },
  { nome: 'Juventus', nome_curto: 'JUV', serie: 'EUR', cidade: 'Turim', estado: 'Piemonte', pais: 'Itália', mascote: 'Zebra (Jay)', slug: 'juventus-turim-piemonte-italia', logo: '/logos/juventus-turim-piemonte-italia.png' },
  { nome: 'PSG', nome_curto: 'PSG', serie: 'EUR', cidade: 'Paris', estado: 'Île-de-France', pais: 'França', mascote: 'Germain le Lynx', slug: 'psg-paris-ile-de-france-franca', logo: '/logos/psg-paris-ile-de-france-franca.png' },
  { nome: 'Napoli', nome_curto: 'NAP', serie: 'EUR', cidade: 'Nápoles', estado: 'Campânia', pais: 'Itália', mascote: "O' Ciuccio (Burro)", slug: 'napoli-napoles-campania-italia', logo: '/logos/napoli-napoles-campania-italia.png' },
  { nome: 'Inter Milan', nome_curto: 'INT', serie: 'EUR', cidade: 'Milão', estado: 'Lombardia', pais: 'Itália', mascote: 'Biscione (Serpente)', slug: 'inter-milan-milao-lombardia-italia', logo: '/logos/inter-milan-milao-lombardia-italia.png' },
  { nome: 'AC Milan', nome_curto: 'ACM', serie: 'EUR', cidade: 'Milão', estado: 'Lombardia', pais: 'Itália', mascote: 'Diavolo (Diabo)', slug: 'ac-milan-milao-lombardia-italia', logo: '/logos/ac-milan-milao-lombardia-italia.png' },
  { nome: 'Newcastle', nome_curto: 'NEW', serie: 'EUR', cidade: 'Newcastle', estado: 'England', pais: 'Inglaterra', mascote: 'Magpie (Pega)', slug: 'newcastle-newcastle-england-inglaterra', logo: '/logos/newcastle-newcastle-england-inglaterra.png' },
  { nome: 'Arsenal', nome_curto: 'ARS', serie: 'EUR', cidade: 'Londres', estado: 'England', pais: 'Inglaterra', mascote: 'Gunnersaurus', slug: 'arsenal-londres-england-inglaterra', logo: '/logos/arsenal-londres-england-inglaterra.png' },
  { nome: 'Dortmund', nome_curto: 'BVB', serie: 'EUR', cidade: 'Dortmund', estado: 'Renânia do Norte-Vestfália', pais: 'Alemanha', mascote: 'Emma (Abelha)', slug: 'dortmund-dortmund-renania-do-norte-vestfalia-alemanha', logo: '/logos/dortmund-dortmund-renania-do-norte-vestfalia-alemanha.png' },
  { nome: 'Atletico Madrid', nome_curto: 'ATM', serie: 'EUR', cidade: 'Madrid', estado: 'Comunidad de Madrid', pais: 'Espanha', mascote: 'Indi', slug: 'atletico-madrid-madrid-comunidad-de-madrid-espanha', logo: '/logos/atletico-madrid-madrid-comunidad-de-madrid-espanha.png' },
  { nome: 'Benfica', nome_curto: 'SLB', serie: 'EUR', cidade: 'Lisboa', estado: 'Lisboa', pais: 'Portugal', mascote: 'Águia Vitória', slug: 'benfica-lisboa-lisboa-portugal', logo: '/logos/benfica-lisboa-lisboa-portugal.png' },
  { nome: 'FC Porto', nome_curto: 'FCP', serie: 'EUR', cidade: 'Porto', estado: 'Porto', pais: 'Portugal', mascote: 'Draco (Dragão)', slug: 'fc-porto-porto-porto-portugal', logo: '/logos/fc-porto-porto-porto-portugal.png' },
  { nome: 'RB Leipzig', nome_curto: 'RBL', serie: 'EUR', cidade: 'Leipzig', estado: 'Saxônia', pais: 'Alemanha', mascote: 'Bulli', slug: 'rb-leipzig-leipzig-saxonia-alemanha', logo: '/logos/rb-leipzig-leipzig-saxonia-alemanha.png' },
  { nome: 'Bayer Leverkusen', nome_curto: 'B04', serie: 'EUR', cidade: 'Leverkusen', estado: 'Renânia do Norte-Vestfália', pais: 'Alemanha', mascote: 'Brian the Lion', slug: 'bayer-leverkusen-leverkusen-renania-do-norte-vestfalia-alemanha', logo: '/logos/bayer-leverkusen-leverkusen-renania-do-norte-vestfalia-alemanha.png' },
  { nome: 'Ajax', nome_curto: 'AJX', serie: 'EUR', cidade: 'Amsterdã', estado: 'Holanda do Norte', pais: 'Holanda', mascote: 'Lucky Lynx', slug: 'ajax-amsterda-holanda-do-norte-holanda', logo: '/logos/ajax-amsterda-holanda-do-norte-holanda.png' },
  { nome: 'Tottenham', nome_curto: 'TOT', serie: 'EUR', cidade: 'Londres', estado: 'England', pais: 'Inglaterra', mascote: 'Chirpy (Galo)', slug: 'tottenham-londres-england-inglaterra', logo: '/logos/tottenham-londres-england-inglaterra.png' },
  { nome: 'Chelsea', nome_curto: 'CHE', serie: 'EUR', cidade: 'Londres', estado: 'England', pais: 'Inglaterra', mascote: 'Stamford the Lion', slug: 'chelsea-londres-england-inglaterra', logo: '/logos/chelsea-londres-england-inglaterra.png' },
  { nome: 'AS Roma', nome_curto: 'ROM', serie: 'EUR', cidade: 'Roma', estado: 'Lácio', pais: 'Itália', mascote: 'Lupa (Loba)', slug: 'as-roma-roma-lacio-italia', logo: '/logos/as-roma-roma-lacio-italia.png' },
  { nome: 'Lazio', nome_curto: 'LAZ', serie: 'EUR', cidade: 'Roma', estado: 'Lácio', pais: 'Itália', mascote: 'Águia Olimpia', slug: 'lazio-roma-lacio-italia', logo: '/logos/lazio-roma-lacio-italia.png' },
  { nome: 'Fiorentina', nome_curto: 'FIO', serie: 'EUR', cidade: 'Florença', estado: 'Toscana', pais: 'Itália', mascote: 'Viola (Lírio)', slug: 'fiorentina-florenca-toscana-italia', logo: '/logos/fiorentina-florenca-toscana-italia.png' },
  { nome: 'Atalanta', nome_curto: 'ATA', serie: 'EUR', cidade: 'Bérgamo', estado: 'Lombardia', pais: 'Itália', mascote: 'La Dea (A Deusa)', slug: 'atalanta-bergamo-lombardia-italia', logo: '/logos/atalanta-bergamo-lombardia-italia.png' },
  { nome: 'Sevilla', nome_curto: 'SEV', serie: 'EUR', cidade: 'Sevilha', estado: 'Andaluzia', pais: 'Espanha', mascote: 'SFC (El Gran Capitán)', slug: 'sevilla-sevilha-andaluzia-espanha', logo: '/logos/sevilla-sevilha-andaluzia-espanha.png' },
  { nome: 'Villarreal', nome_curto: 'VIL', serie: 'EUR', cidade: 'Vila-real', estado: 'Comunidade Valenciana', pais: 'Espanha', mascote: 'Submarino Amarelo', slug: 'villarreal-vila-real-comunidade-valenciana-espanha', logo: '/logos/villarreal-vila-real-comunidade-valenciana-espanha.png' },
  { nome: 'Valencia', nome_curto: 'VAL', serie: 'EUR', cidade: 'Valência', estado: 'Comunidade Valenciana', pais: 'Espanha', mascote: 'Morcego (Bat)', slug: 'valencia-valencia-comunidade-valenciana-espanha', logo: '/logos/valencia-valencia-comunidade-valenciana-espanha.png' },
  { nome: 'Athletic Bilbao', nome_curto: 'ATH', serie: 'EUR', cidade: 'Bilbao', estado: 'País Basco', pais: 'Espanha', mascote: 'Los Leones', slug: 'athletic-bilbao-bilbao-pais-basco-espanha', logo: '/logos/athletic-bilbao-bilbao-pais-basco-espanha.png' },
  { nome: 'Wolfsburg', nome_curto: 'WOL', serie: 'EUR', cidade: 'Wolfsburg', estado: 'Baixa Saxônia', pais: 'Alemanha', mascote: 'Wölfi (Lobinho)', slug: 'wolfsburg-wolfsburg-baixa-saxonia-alemanha', logo: '/logos/wolfsburg-wolfsburg-baixa-saxonia-alemanha.png' },
  { nome: 'Hertha Berlin', nome_curto: 'BSC', serie: 'EUR', cidade: 'Berlim', estado: 'Berlim', pais: 'Alemanha', mascote: 'Hertinho (Urso)', slug: 'hertha-berlin-berlim-berlim-alemanha', logo: '/logos/hertha-berlin-berlim-berlim-alemanha.png' },
  { nome: 'Marseille', nome_curto: 'OM', serie: 'EUR', cidade: 'Marselha', estado: 'Provença', pais: 'França', mascote: 'Droit au But', slug: 'marseille-marselha-provenca-franca', logo: '/logos/marseille-marselha-provenca-franca.png' },
  { nome: 'Lille', nome_curto: 'LOSC', serie: 'EUR', cidade: 'Lille', estado: 'Hauts-de-France', pais: 'França', mascote: 'Dogue (Dogão)', slug: 'lille-lille-hauts-de-france-franca', logo: '/logos/lille-lille-hauts-de-france-franca.png' },
  { nome: 'Monaco', nome_curto: 'ASM', serie: 'EUR', cidade: 'Mônaco', estado: 'Mônaco', pais: 'Mônaco', mascote: 'Hércules', slug: 'monaco-monaco-monaco-monaco', logo: '/logos/monaco-monaco-monaco-monaco.png' },
  { nome: 'Rennes', nome_curto: 'REN', serie: 'EUR', cidade: 'Rennes', estado: 'Bretanha', pais: 'França', mascote: 'Herminig (Arminho)', slug: 'rennes-rennes-bretanha-franca', logo: '/logos/rennes-rennes-bretanha-franca.png' },
  { nome: 'Sporting CP', nome_curto: 'SCP', serie: 'EUR', cidade: 'Lisboa', estado: 'Lisboa', pais: 'Portugal', mascote: 'Leão', slug: 'sporting-cp-lisboa-lisboa-portugal', logo: '/logos/sporting-cp-lisboa-lisboa-portugal.png' },
  { nome: 'Braga', nome_curto: 'SCB', serie: 'EUR', cidade: 'Braga', estado: 'Braga', pais: 'Portugal', mascote: 'Arsenalista', slug: 'braga-braga-braga-portugal', logo: '/logos/braga-braga-braga-portugal.png' },
  { nome: 'Feyenoord', nome_curto: 'FEY', serie: 'EUR', cidade: 'Roterdã', estado: 'Holanda do Sul', pais: 'Holanda', mascote: 'Cockrobin', slug: 'feyenoord-roterda-holanda-do-sul-holanda', logo: '/logos/feyenoord-roterda-holanda-do-sul-holanda.png' },
  { nome: 'PSV Eindhoven', nome_curto: 'PSV', serie: 'EUR', cidade: 'Eindhoven', estado: 'Brabante do Norte', pais: 'Holanda', mascote: 'Phoxy', slug: 'psv-eindhoven-eindhoven-brabante-do-norte-holanda', logo: '/logos/psv-eindhoven-eindhoven-brabante-do-norte-holanda.png' },
  { nome: 'Celtic', nome_curto: 'CEL', serie: 'EUR', cidade: 'Glasgow', estado: 'Scotland', pais: 'Escócia', mascote: 'Hoopy the Huddle Hound', slug: 'celtic-glasgow-scotland-escocia', logo: '/logos/celtic-glasgow-scotland-escocia.png' },
  { nome: 'Rangers', nome_curto: 'RAN', serie: 'EUR', cidade: 'Glasgow', estado: 'Scotland', pais: 'Escócia', mascote: 'Broxi Bear', slug: 'rangers-glasgow-scotland-escocia', logo: '/logos/rangers-glasgow-scotland-escocia.png' },
  { nome: 'Galatasaray', nome_curto: 'GAL', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Aslan (Leão)', slug: 'galatasaray-istambul-istambul-turquia', logo: '/logos/galatasaray-istambul-istambul-turquia.png' },
  { nome: 'Fenerbahce', nome_curto: 'FEN', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Canário', slug: 'fenerbahce-istambul-istambul-turquia', logo: '/logos/fenerbahce-istambul-istambul-turquia.png' },
  { nome: 'Besiktas', nome_curto: 'BES', serie: 'EUR', cidade: 'Istambul', estado: 'Istambul', pais: 'Turquia', mascote: 'Kara Kartal (Águia Negra)', slug: 'besiktas-istambul-istambul-turquia', logo: '/logos/besiktas-istambul-istambul-turquia.png' },
  { nome: 'Shakhtar Donetsk', nome_curto: 'SHA', serie: 'EUR', cidade: 'Donetsk', estado: 'Donetsk', pais: 'Ucrânia', mascote: 'Minerador', slug: 'shakhtar-donetsk-donetsk-donetsk-ucrania', logo: '/logos/shakhtar-donetsk-donetsk-donetsk-ucrania.png' },
  { nome: 'Dynamo Kyiv', nome_curto: 'DKV', serie: 'EUR', cidade: 'Kiev', estado: 'Kiev', pais: 'Ucrânia', mascote: 'Leão Branco', slug: 'dynamo-kyiv-kiev-kiev-ucrania', logo: '/logos/dynamo-kyiv-kiev-kiev-ucrania.png' },
  { nome: 'Olympiakos', nome_curto: 'OLY', serie: 'EUR', cidade: 'Pireu', estado: 'Ática', pais: 'Grécia', mascote: 'Thrylos (Lenda)', slug: 'olympiakos-pireu-atica-grecia', logo: '/logos/olympiakos-pireu-atica-grecia.png' },
  { nome: 'Panathinaikos', nome_curto: 'PAN', serie: 'EUR', cidade: 'Atenas', estado: 'Ática', pais: 'Grécia', mascote: 'Trevo', slug: 'panathinaikos-atenas-atica-grecia', logo: '/logos/panathinaikos-atenas-atica-grecia.png' },
  { nome: 'PAOK', nome_curto: 'PAO', serie: 'EUR', cidade: 'Salônica', estado: 'Macedônia Central', pais: 'Grécia', mascote: 'Águia Bicéfala', slug: 'paok-salonica-macedonia-central-grecia', logo: '/logos/paok-salonica-macedonia-central-grecia.png' },

  // ═══════════════════════════════════════════════════════════
  // INTERNACIONAL - AMÉRICA DO SUL (30 CLUBES)
  // ═══════════════════════════════════════════════════════════
  { nome: 'Boca Juniors', nome_curto: 'BOC', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Xeneize', slug: 'boca-juniors-buenos-aires-buenos-aires-argentina', logo: '/logos/boca-juniors-buenos-aires-buenos-aires-argentina.png' },
  { nome: 'River Plate', nome_curto: 'RIV', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Millonario', slug: 'river-plate-buenos-aires-buenos-aires-argentina', logo: '/logos/river-plate-buenos-aires-buenos-aires-argentina.png' },
  { nome: 'Peñarol', nome_curto: 'PEN', serie: 'INT', cidade: 'Montevidéu', estado: 'Montevidéu', pais: 'Uruguai', mascote: 'Manya', slug: 'penarol-montevideu-montevideu-uruguai', logo: '/logos/penarol-montevideu-montevideu-uruguai.png' },
  { nome: 'Olimpia', nome_curto: 'OLI', serie: 'INT', cidade: 'Assunção', estado: 'Central', pais: 'Paraguai', mascote: 'Decano', slug: 'olimpia-assuncao-central-paraguai', logo: '/logos/olimpia-assuncao-central-paraguai.png' },
  { nome: 'Atlético Nacional', nome_curto: 'ATN', serie: 'INT', cidade: 'Medellín', estado: 'Antioquia', pais: 'Colômbia', mascote: 'Verdolaga', slug: 'atletico-nacional-medellin-antioquia-colombia', logo: '/logos/atletico-nacional-medellin-antioquia-colombia.png' },
  { nome: 'Libertad', nome_curto: 'LIB', serie: 'INT', cidade: 'Assunção', estado: 'Central', pais: 'Paraguai', mascote: 'Gumarelo', slug: 'libertad-assuncao-central-paraguai', logo: '/logos/libertad-assuncao-central-paraguai.png' },
  { nome: 'Racing Club', nome_curto: 'RAC', serie: 'INT', cidade: 'Avellaneda', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'La Academia', slug: 'racing-club-avellaneda-buenos-aires-argentina', logo: '/logos/racing-club-avellaneda-buenos-aires-argentina.png' },
  { nome: 'Independiente', nome_curto: 'IND', serie: 'INT', cidade: 'Avellaneda', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Rojo (Diabo Vermelho)', slug: 'independiente-avellaneda-buenos-aires-argentina', logo: '/logos/independiente-avellaneda-buenos-aires-argentina.png' },
  { nome: 'Nacional-URU', nome_curto: 'NAC', serie: 'INT', cidade: 'Montevidéu', estado: 'Montevidéu', pais: 'Uruguai', mascote: 'Bolso', slug: 'nacional-uru-montevideu-montevideu-uruguai', logo: '/logos/nacional-uru-montevideu-montevideu-uruguai.png' },
  { nome: 'San Lorenzo', nome_curto: 'SLO', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Ciclón', slug: 'san-lorenzo-buenos-aires-buenos-aires-argentina', logo: '/logos/san-lorenzo-buenos-aires-buenos-aires-argentina.png' },
  { nome: 'Colo-Colo', nome_curto: 'CC', serie: 'INT', cidade: 'Santiago', estado: 'Região Metropolitana', pais: 'Chile', mascote: 'Cacique', slug: 'colo-colo-santiago-regiao-metropolitana-chile', logo: '/logos/colo-colo-santiago-regiao-metropolitana-chile.png' },
  { nome: 'Ind. del Valle', nome_curto: 'IDV', serie: 'INT', cidade: 'Sangolquí', estado: 'Pichincha', pais: 'Equador', mascote: 'Rayado', slug: 'ind-del-valle-sangolqui-pichincha-equador', logo: '/logos/ind-del-valle-sangolqui-pichincha-equador.png' },
  { nome: 'LDU Quito', nome_curto: 'LDU', serie: 'INT', cidade: 'Quito', estado: 'Pichincha', pais: 'Equador', mascote: 'Rey de Copas', slug: 'ldu-quito-quito-pichincha-equador', logo: '/logos/ldu-quito-quito-pichincha-equador.png' },
  { nome: 'Barcelona-EQU', nome_curto: 'BSC', serie: 'INT', cidade: 'Guayaquil', estado: 'Guayas', pais: 'Equador', mascote: 'Torero', slug: 'barcelona-equ-guayaquil-guayas-equador', logo: '/logos/barcelona-equ-guayaquil-guayas-equador.png' },
  { nome: 'Cerro Porteño', nome_curto: 'CCP', serie: 'INT', cidade: 'Assunção', estado: 'Central', pais: 'Paraguai', mascote: 'Ciclón', slug: 'cerro-porteno-assuncao-central-paraguai', logo: '/logos/cerro-porteno-assuncao-central-paraguai.png' },
  { nome: 'Estudiantes', nome_curto: 'EST', serie: 'INT', cidade: 'La Plata', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Pincha', slug: 'estudiantes-la-plata-buenos-aires-argentina', logo: '/logos/estudiantes-la-plata-buenos-aires-argentina.png' },
  { nome: 'Vélez Sarsfield', nome_curto: 'VEL', serie: 'INT', cidade: 'Buenos Aires', estado: 'Buenos Aires', pais: 'Argentina', mascote: 'Fortín', slug: 'velez-sarsfield-buenos-aires-buenos-aires-argentina', logo: '/logos/velez-sarsfield-buenos-aires-buenos-aires-argentina.png' },
  { nome: 'U. de Chile', nome_curto: 'UCH', serie: 'INT', cidade: 'Santiago', estado: 'Região Metropolitana', pais: 'Chile', mascote: 'Chuncho (Coruja)', slug: 'u-de-chile-santiago-regiao-metropolitana-chile', logo: '/logos/u-de-chile-santiago-regiao-metropolitana-chile.png' },
  { nome: 'U. Católica', nome_curto: 'UCA', serie: 'INT', cidade: 'Santiago', estado: 'Região Metropolitana', pais: 'Chile', mascote: 'Cruzado', slug: 'u-catolica-santiago-regiao-metropolitana-chile', logo: '/logos/u-catolica-santiago-regiao-metropolitana-chile.png' },
  { nome: 'Alianza Lima', nome_curto: 'ALI', serie: 'INT', cidade: 'Lima', estado: 'Lima', pais: 'Peru', mascote: 'Gato', slug: 'alianza-lima-lima-lima-peru', logo: '/logos/alianza-lima-lima-lima-peru.png' },
  { nome: 'Universitario', nome_curto: 'UNI', serie: 'INT', cidade: 'Lima', estado: 'Lima', pais: 'Peru', mascote: 'Crema', slug: 'universitario-lima-lima-peru', logo: '/logos/universitario-lima-lima-peru.png' },
  { nome: 'Bolívar', nome_curto: 'BOL', serie: 'INT', cidade: 'La Paz', estado: 'La Paz', pais: 'Bolívia', mascote: 'Academia', slug: 'bolivar-la-paz-la-paz-bolivia', logo: '/logos/bolivar-la-paz-la-paz-bolivia.png' },
  { nome: 'The Strongest', nome_curto: 'STR', serie: 'INT', cidade: 'La Paz', estado: 'La Paz', pais: 'Bolívia', mascote: 'Tigre', slug: 'the-strongest-la-paz-la-paz-bolivia', logo: '/logos/the-strongest-la-paz-la-paz-bolivia.png' },
  { nome: 'Millonarios', nome_curto: 'MIL', serie: 'INT', cidade: 'Bogotá', estado: 'Cundinamarca', pais: 'Colômbia', mascote: 'Embajador', slug: 'millonarios-bogota-cundinamarca-colombia', logo: '/logos/millonarios-bogota-cundinamarca-colombia.png' },
  { nome: 'Junior Barranquilla', nome_curto: 'JUN', serie: 'INT', cidade: 'Barranquilla', estado: 'Atlántico', pais: 'Colômbia', mascote: 'Tiburón', slug: 'junior-barranquilla-barranquilla-atlantico-colombia', logo: '/logos/junior-barranquilla-barranquilla-atlantico-colombia.png' },
  { nome: 'Caracas FC', nome_curto: 'CFC', serie: 'INT', cidade: 'Caracas', estado: 'Distrito Capital', pais: 'Venezuela', mascote: 'Rojo', slug: 'caracas-fc-caracas-distrito-capital-venezuela', logo: '/logos/caracas-fc-caracas-distrito-capital-venezuela.png' },
  { nome: 'Dep. Táchira', nome_curto: 'TAC', serie: 'INT', cidade: 'San Cristóbal', estado: 'Táchira', pais: 'Venezuela', mascote: 'Aurinegro', slug: 'dep-tachira-san-cristobal-tachira-venezuela', logo: '/logos/dep-tachira-san-cristobal-tachira-venezuela.png' },
  { nome: 'Melgar', nome_curto: 'MEL', serie: 'INT', cidade: 'Arequipa', estado: 'Arequipa', pais: 'Peru', mascote: 'Dominó', slug: 'melgar-arequipa-arequipa-peru', logo: '/logos/melgar-arequipa-arequipa-peru.png' },
  { nome: 'Defensor Sporting', nome_curto: 'DEF', serie: 'INT', cidade: 'Montevidéu', estado: 'Montevidéu', pais: 'Uruguai', mascote: 'Violeta', slug: 'defensor-sporting-montevideu-montevideu-uruguai', logo: '/logos/defensor-sporting-montevideu-montevideu-uruguai.png' },
  { nome: 'Emelec', nome_curto: 'EME', serie: 'INT', cidade: 'Guayaquil', estado: 'Guayas', pais: 'Equador', mascote: 'Eléctrico', slug: 'emelec-guayaquil-guayas-equador', logo: '/logos/emelec-guayaquil-guayas-equador.png' },
];
