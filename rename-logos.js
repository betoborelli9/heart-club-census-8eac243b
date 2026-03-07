import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGOS_DIR = path.join(__dirname, "public", "logos");

const MAPPING = {
  // --- IDs DA SÉRIE A (CORRIGIDOS CONFORME SEUS PRINTS) ---
  "33": "vitoria-salvador-ba-brasil",
  "34": "vasco-rio-de-janeiro-rj-brasil",
  "40": "sao-paulo-sao-paulo-sp-brasil",
  "42": "santos-santos-sp-brasil",
  "47": "palmeiras-sao-paulo-sp-brasil",
  "49": "mirassol-mirassol-sp-brasil",
  "118": "gremio-porto-alegre-rs-brasil",
  "119": "fluminense-rio-de-janeiro-rj-brasil",
  "120": "flamengo-rio-de-janeiro-rj-brasil",
  "121": "cruzeiro-belo-horizonte-mg-brasil",
  "124": "coritiba-curitiba-pr-brasil",
  "126": "corinthians-sao-paulo-sp-brasil",
  "127": "chapecoense-chapeco-sc-brasil",
  "210": "athletico-pr-curitiba-pr-brasil",
  "1035": "atletico-mg-belo-horizonte-mg-brasil",
  "1062": "atletico-mg-belo-horizonte-mg-brasil",
  "131": "bahia-salvador-ba-brasil",
  "133": "botafogo-rio-de-janeiro-rj-brasil",
  "144": "bragantino-braganca-paulista-sp-brasil",

  // --- SÉRIE B, C e D (CONSOLIDADO) ---
  "149": "america-mg-belo-horizonte-mg-brasil",
  "150": "atletico-go-goiania-go-brasil",
  "155": "goias-goiania-go-brasil",
  "160": "vila-nova-goiania-go-brasil",
  "161": "abc-natal-rn-brasil",
  "173": "anapolis-anapolis-go-brasil",
  "194": "america-rn-natal-rn-brasil",
  "195": "aparecidense-aparecida-de-goiania-go-brasil",
  "197": "asa-arapiraca-al-brasil",
  "327": "joinville-joinville-sc-brasil",
  "328": "juazeirense-juazeiro-ba-brasil",
  "329": "lagarto-lagarto-se-brasil",

  // --- EUROPA (EUR) ---
  "50": "manchester-city-manchester-england-inglaterra",
  "541": "real-madrid-madrid-comunidad-de-madrid-espanha",
  "529": "barcelona-barcelona-catalunha-espanha",
  "489": "ac-milan-milao-lombardia-italia",
  "496": "juventus-turim-piemonte-italia",
  "211": "benfica-lisboa-lisboa-portugal",
  "212": "fc-porto-porto-porto-portugal",
  "231": "sporting-cp-lisboa-lisboa-portugal",
  "247": "celtic-glasgow-scotland-escocia",
  "551": "fenerbahce-istambul-istambul-turquia",
  "611": "galatasaray-istambul-istambul-turquia",
  "550": "shakhtar-donetsk-donetsk-donetsk-ucrania",
  "79": "paok-salonica-macedonia-central-grecia",

  // --- AMÉRICA DO SUL (INT) ---
  "451": "boca-juniors-buenos-aires-buenos-aires-argentina",
  "81": "penarol-montevideu-montevideu-uruguai",
  "85": "independiente-avellaneda-buenos-aires-argentina",
  "91": "barcelona-equ-guayaquil-guayas-equador",
  "94": "u-de-chile-santiago-regiao-metropolitana-chile",
  "450": "estudiantes-la-plata-buenos-aires-argentina",
  "1135": "junior-barranquilla-barranquilla-atlantico-colombia",
  "105": "emelec-guayaquil-guayas-equador"
};

function runRename() {
  console.log("🚀 Executando renomeação INTEGRAL...");
  if (!fs.existsSync(LOGOS_DIR)) {
    console.error("❌ Pasta public/logos não encontrada!");
    return;
  }

  let count = 0;
  Object.entries(MAPPING).forEach(([id, slug]) => {
    const oldPath = path.join(LOGOS_DIR, `${id}.png`);
    const newPath = path.join(LOGOS_DIR, `${slug}.png`);

    if (fs.existsSync(oldPath)) {
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ [${id}.png] -> [${slug}.png]`);
        count++;
      } catch (err) {
        console.error(`⚠️ Erro em ${id}.png: ${err.message}`);
      }
    }
  });

  console.log(`\n✨ Pronto! ${count} logos renomeadas com sucesso.`);
}

runRename();