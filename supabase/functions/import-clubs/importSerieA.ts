/**
 * Caminho: supabase/functions/import-clubs/importSerieA.ts
 * Contexto: Motor de Busca Ultra-Agressivo v6 - Heart Club
 * Versão: CORRIGIDA, ESTÁVEL E PRONTA PRA PRODUÇÃO
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';
import { colorDictionary } from "../utils/colors.ts";

// =========================
// ENV
// =========================
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =========================
// FALLBACK DE CORES (TEXTO → HEX)
// =========================
function parseColors(text: string): string[] {
  return text
    .toLowerCase()
    .split(/e|,|\//)
    .map(c => c.trim())
    .map(c => colorDictionary[c] ?? null)
    .filter(Boolean) as string[];
}

// =========================
// ENGINE PRINCIPAL
// =========================
async function engineDiscover(nomeClube: string) {
  try {
    const searchRes = await fetch(
      `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        nomeClube + ' clube futebol'
      )}&format=json&origin=*`
    );

    const searchData = await searchRes.json();
    const pageTitle = searchData?.query?.search?.[0]?.title;

    if (!pageTitle) return null;

    const url = `https://pt.wikipedia.org/wiki/${encodeURIComponent(
      pageTitle.replace(/\s+/g, '_')
    )}`;

    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);
    const infobox = $('.infobox');

    // =========================
    // MASCOTE / APELIDO
    // =========================
    let mascote: string | null = null;

    const seletoresNomes = ["Mascote", "Alcunha", "Apelido", "Alcunhas"];

    for (const s of seletoresNomes) {
      const valor = infobox.find(`th:contains("${s}")`).next('td').text().trim();
      if (valor && valor.length > 1 && valor !== s) {
        mascote = valor;
        break;
      }
    }

    if (mascote) {
      mascote = mascote
        .replace(/\[\d+\]/g, '')
        .split('\n')[0]
        .split(',')[0]
        .split('(')[0]
        .trim();
    }

    // =========================
    // CORES
    // =========================
    const cores: string[] = [];

    // Método 1: CSS inline
    infobox
      .find('tr:contains("Cores") td span[style*="background-color"]')
      .each((_, el) => {
        const style = $(el).attr('style') || '';
        const match = style.match(
          /background-color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))/i
        );
        if (match) cores.push(match[1]);
      });

    // Método 2: Texto → dicionário
    if (cores.length === 0) {
      const textoCores = infobox.find('tr:contains("Cores") td').text();
      if (textoCores) {
        cores.push(...parseColors(textoCores));
      }
    }

    // =========================
    // FUTEBOL FEMININO
    // =========================
    const regexFeminino =
      /futebol feminino|equipe feminina|time feminino|elenco feminino|gurias|sereias/i;

    const temFeminino =
      regexFeminino.test(html) ||
      $('a:contains("feminino")').length > 0 ||
      $('h2:contains("Feminino")').length > 0;

    // =========================
    // RETORNO FINAL
    // =========================
    return {
      mascote: mascote || null,
      cor_primaria: cores[0] || null,
      cor_secundaria: cores[1] || null,
      cor_terciaria: cores[2] || null,
      has_feminino: temFeminino ?? false
    };

  } catch (error) {
    console.error('Erro no engineDiscover:', error);
    return null;
  }
}

// =========================
// FUNÇÃO PRINCIPAL (EXPORT)
// =========================
export async function importarSerieA() {
  try {
    const { data: clubes, error } = await supabase
      .from('clubes_cache')
      .select('nome');

    if (error) {
      console.error('Erro ao buscar clubes:', error);
      return;
    }

    if (!clubes || clubes.length === 0) {
      console.log('Nenhum clube encontrado.');
      return;
    }

    for (const clube of clubes) {
      console.log(`Processando: ${clube.nome}`);

      const extraido = await engineDiscover(clube.nome);

      if (extraido) {
        const { error: updateError } = await supabase
          .from('clubes_cache')
          .update(extraido)
          .eq('nome', clube.nome);

        if (updateError) {
          console.error(`Erro ao atualizar ${clube.nome}:`, updateError);
        } else {
          console.log(`Atualizado: ${clube.nome}`);
        }
      } else {
        console.log(`Sem dados: ${clube.nome}`);
      }
    }

  } catch (error) {
    console.error('Erro geral:', error);
  }
}