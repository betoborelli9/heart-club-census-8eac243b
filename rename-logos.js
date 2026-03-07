#!/usr/bin/env node
/**
 * rename-logos.js
 * Renomeia em massa logos de {api_id}.png -> {nome-cidade-estado-pais}.png
 * Fonte única: src/clubes-data.ts
 *
 * Uso:
 *   node rename-logos.js
 *   node rename-logos.js --dry-run
 */
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const LOGOS_DIR = path.join(ROOT_DIR, "public", "logos");
const CLUBS_DATA_FILE = path.join(ROOT_DIR, "src", "clubes-data.ts");
const DRY_RUN = process.argv.includes("--dry-run");

function generateSlug(nome, cidade, estado, pais) {
  return `${nome}-${cidade}-${estado}-${pais}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readClubsFromSource() {
  if (!fs.existsSync(CLUBS_DATA_FILE)) {
    throw new Error(`Arquivo não encontrado: ${CLUBS_DATA_FILE}`);
  }

  const fileContent = fs.readFileSync(CLUBS_DATA_FILE, "utf8");
  const clubRegex = /\{\s*api_id:\s*(\d+),\s*nome:\s*'([^']+)',\s*nome_curto:\s*'[^']*',\s*serie:\s*'[^']*',\s*cidade:\s*'([^']+)',\s*estado:\s*'([^']+)',\s*pais:\s*'([^']+)'/g;

  const clubs = [];
  let match;

  while ((match = clubRegex.exec(fileContent)) !== null) {
    clubs.push({
      api_id: Number(match[1]),
      nome: match[2],
      cidade: match[3],
      estado: match[4],
      pais: match[5],
    });
  }

  if (clubs.length < 180) {
    throw new Error(`Mapeamento incompleto detectado (${clubs.length} clubes lidos).`);
  }

  return clubs;
}

function renameLogos() {
  if (!fs.existsSync(LOGOS_DIR)) {
    throw new Error(`Pasta não encontrada: ${LOGOS_DIR}`);
  }

  const clubs = readClubsFromSource();
  let renamed = 0;
  let skipped = 0;
  let missing = 0;

  console.log(`🔎 Clubes mapeados: ${clubs.length}`);
  console.log(`📁 Pasta de logos: ${LOGOS_DIR}`);
  console.log(`🧪 Modo: ${DRY_RUN ? "DRY RUN (sem alterações)" : "EXECUÇÃO REAL"}`);
  console.log("─".repeat(96));

  for (const club of clubs) {
    const oldFileName = `${club.api_id}.png`;
    const newFileName = `${generateSlug(club.nome, club.cidade, club.estado, club.pais)}.png`;
    const oldPath = path.join(LOGOS_DIR, oldFileName);
    const newPath = path.join(LOGOS_DIR, newFileName);

    if (fs.existsSync(newPath)) {
      skipped += 1;
      continue;
    }

    if (!fs.existsSync(oldPath)) {
      missing += 1;
      console.log(`⚠️  ${oldFileName.padEnd(12)} -> ${newFileName}  [não encontrado]`);
      continue;
    }

    if (!DRY_RUN) {
      fs.renameSync(oldPath, newPath);
    }

    renamed += 1;
    console.log(`✅ ${oldFileName.padEnd(12)} -> ${newFileName}`);
  }

  console.log("─".repeat(96));
  console.log(`✅ Renomeados: ${renamed}`);
  console.log(`⏭️  Já no padrão: ${skipped}`);
  console.log(`⚠️  IDs sem arquivo: ${missing}`);

  if (DRY_RUN) {
    console.log("\nℹ️ Nenhum arquivo foi alterado (--dry-run). Remova a flag para executar de verdade.");
  }
}

try {
  renameLogos();
} catch (error) {
  console.error("❌ Falha na renomeação:", error.message);
  process.exit(1);
}
