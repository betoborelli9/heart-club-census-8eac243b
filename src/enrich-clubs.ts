/* Caminho: src/enrich-clubs.ts
   Objetivo: Enriquecimento de Dados (Versão Final e Estável)
   Contexto: Projeto Heart Club - Busca na Wikipedia via Node.js
*/
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// CONFIGURAÇÃO DE ACESSO DO SEU PROJETO NOVO
const supabaseUrl = 'https://tmttlchkqjtbusfdwyrx.supabase.co'; 
const supabaseKey = 'sb_secret_cC2ynEFUCM5FQcz_QIW5bA_HPZoyOMA'; 

// INJEÇÃO DO MOTOR DE REDE: Resolve o erro "fetch failed" no Codespace
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch }
});

async function enrichClubs() {
  console.log("🤖 Iniciando robô de enriquecimento Heart Club...");

  try {
    // 1. Busca clubes que ainda não possuem história (null)
    const { data: clubs, error } = await supabase
      .from('clubes_cache')
      .select('api_id, nome')
      .is('historia', null);

    if (error) throw error;

    if (!clubs || clubs.length === 0) {
      console.log("✅ Todos os clubes já estão enriquecidos ou a tabela está vazia!");
      console.log("DICA: Se a tabela estiver vazia, rode: npx vite-node src/seed-db.ts primeiro.");
      return;
    }

    console.log(`🔎 Encontrados ${clubs.length} clubes para processar.`);

    for (const club of clubs) {
      try {
        // 2. Monta a URL de busca na Wikipedia (PT-BR)
        const wikiUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(club.nome.replace(/\s/g, '_'))}`;
        
        // @ts-ignore
        const response = await fetch(wikiUrl);
        const wikiData = await response.json();

        if (wikiData && wikiData.extract) {
          // 3. Atualiza o registro no Supabase
          const { error: updateError } = await supabase
            .from('clubes_cache')
            .update({
              historia: wikiData.extract,
              // Tenta pegar uma imagem de escudo maior se disponível
              escudo_url: wikiData.originalimage?.source || undefined 
            })
            .eq('api_id', club.api_id);

          if (updateError) throw updateError;
          console.log(`✅ ${club.nome} enriquecido com sucesso.`);
        } else {
          console.log(`⚠️ Wikipedia não retornou dados para: ${club.nome}.`);
        }
      } catch (err) {
        console.error(`❌ Erro ao processar o clube ${club.nome}:`, err);
      }
      
      // 4. Pausa de 500ms para evitar bloqueios por excesso de requisições
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log("🏁 Processo de enriquecimento finalizado!");
  } catch (mainError) {
    console.error("❌ Falha crítica de conexão:", mainError.message);
  }
}

enrichClubs();