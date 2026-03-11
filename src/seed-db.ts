/* Caminho: src/seed-db.ts
   Objetivo: Injeção direta via Node.js
*/
import { createClient } from '@supabase/supabase-js';
import { CLUBS_DATA } from "./clubes-data.ts";

// SUBSTITUA AQUI COM OS DADOS DA SUA IMAGEM
const supabaseUrl = 'https://tmttlchkqjtbusfdwyrx.supabase.co'; 
const supabaseKey = 'sb_secret_cC2ynEFUCM5FQcz_QIW5bA_HPZoyOMA'; // Use a anon key da sua imagem

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log("🚀 Iniciando injeção de 236 clubes no Heart Club...");

  for (const club of CLUBS_DATA) {
    const { error } = await supabase
      .from('clubes_cache')
      .upsert({
        nome: club.nome,
        nome_curto: club.nome_curto,
        escudo_url: club.logoUrl,
      }, { onConflict: 'nome' });

    if (error) {
      console.error(`❌ Erro em ${club.nome}:`, error.message);
    } else {
      console.log(`✅ ${club.nome} (${club.serie}) OK.`);
    }
  }

  console.log("🏁 Carga finalizada!");
}

seedDatabase();