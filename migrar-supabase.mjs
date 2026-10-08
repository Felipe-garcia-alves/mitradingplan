import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

// Firebase config
const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID
};

// Supabase config (service_role para bypass RLS)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltam SUPABASE_URL / SUPABASE_SERVICE_KEY. Defina no .env (nunca no codigo).");
  process.exit(1);
}
// Mapeamento Firebase UID -> Supabase UUID
// Adicione aqui todos os usuários
const USUARIOS = [
  { firebaseUid: "AvncNVVb88QU1ilAWMWNOUltV6F3", supabaseId: "0eb4950a-bc4b-4d83-8977-3d353d28f7a2" },
  // Adicione outros usuários abaixo:
  // { firebaseUid: "FIREBASE_UID_2", supabaseId: "SUPABASE_UUID_2" },
  // { firebaseUid: "FIREBASE_UID_3", supabaseId: "SUPABASE_UUID_3" },
];

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const sup = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrarUsuario(firebaseUid, supabaseId) {
  console.log(`\n── Migrando ${firebaseUid} → ${supabaseId}`);

  // 1. Dados principais do usuário
  const userDoc = await getDoc(doc(db, "usuarios", firebaseUid));
  if (!userDoc.exists()) {
    console.log("  ⚠ Usuário não encontrado no Firestore, pulando...");
    return;
  }
  const userData = userDoc.data();
  const { error: userErr } = await sup.from("usuarios").upsert({
    id:         supabaseId,
    nome:       userData.nome || "",
    email:      userData.email || "",
    criado_em:  userData.criadoEm || new Date().toISOString(),
    config:     userData.config     || { bancaB3: 3000, bancaForex: 200 },
    compliance: userData.compliance || {},
    regras:     userData.regras     || [],
  });
  if (userErr) { console.error("  ✗ Erro usuário:", userErr.message); return; }
  console.log("  ✓ Dados do usuário copiados");

  // 2. Diário
  const diarioSnap = await getDocs(collection(db, "usuarios", firebaseUid, "diario"));
  let diarioCount = 0;
  for (const d of diarioSnap.docs) {
    const { error } = await sup.from("diario").upsert({
      usuario_id: supabaseId,
      data_key:   d.id,
      dados:      d.data(),
    });
    if (error) console.error(`  ✗ Erro diário ${d.id}:`, error.message);
    else diarioCount++;
  }
  console.log(`  ✓ ${diarioCount} entradas do diário copiadas`);

  // 3. Estratégias
  const estSnap = await getDocs(collection(db, "usuarios", firebaseUid, "estrategias"));
  let estCount = 0;
  for (const d of estSnap.docs) {
    const { error } = await sup.from("estrategias").upsert({
      usuario_id:  supabaseId,
      firebase_id: d.id,
      dados:       d.data(),
    });
    if (error) console.error(`  ✗ Erro estratégia ${d.id}:`, error.message);
    else estCount++;
  }
  console.log(`  ✓ ${estCount} estratégias copiadas`);
}

async function main() {
  console.log("🚀 Iniciando migração Firestore → Supabase...");
  for (const u of USUARIOS) {
    await migrarUsuario(u.firebaseUid, u.supabaseId);
  }
  console.log("\n✅ Migração concluída!");
  process.exit(0);
}

main().catch(e => { console.error("Erro geral:", e); process.exit(1); });
