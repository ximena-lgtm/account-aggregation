import db from "./db.js";

const banks = [
  ["bancolombia", "Bancolombia", "bancolombia", "#FFD100", "banco", 1],
  ["nu", "Nu", "nu", "#820AD1", "banco", 2],
  ["daviplata", "Daviplata", "daviplata", "#BE1622", "wallet", 3],
  ["nequi", "Nequi", "nequi", "#200020", "wallet", 4],
  ["davivienda", "Davivienda", "generic", "#ED1C27", "banco", 5],
  ["bbva", "BBVA Colombia", "generic", "#1464A5", "banco", 6],
  ["bogota", "Banco de Bogotá", "generic", "#00488D", "banco", 7],
  ["occidente", "Banco de Occidente", "generic", "#0F6B3B", "banco", 8],
  ["scotiabank", "Scotiabank Colpatria", "generic", "#EC111A", "banco", 9],
  ["av_villas", "Banco AV Villas", "generic", "#E4022D", "banco", 10],
  ["popular", "Banco Popular", "generic", "#00843D", "banco", 11],
  ["itau", "Itaú", "generic", "#EC7000", "banco", 12],
  ["falabella", "Banco Falabella", "generic", "#7AB800", "banco", 13]
];

const insert = db.prepare(
  "INSERT OR REPLACE INTO banks (id,name,brand,color,type,display_order,enabled) VALUES (?,?,?,?,?,?,1)"
);
for (const b of banks) insert.run(...b);
console.log(`Seed listo: ${banks.length} entidades en el Directorio SFC.`);
