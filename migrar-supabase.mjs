import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAw4ch3ezT_2wPa7TidnXRWRsuF4ojRv3Y",
  authDomain: "mitrandinplan.firebaseapp.com",
  projectId: "mitrandinplan",
  storageBucket: "mitrandinplan.firebasestorage.app",
  messagingSenderId: "1090271175226",
  appId: "1:1090271175226:web:c8c51435f5f9e3732a0b03"
};

// Supabase config (service_role para bypass RLS)
const SUPABASE_URL  = "https://lbgoihpjmlwgcwzblnhe.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZ29paHBqbWx3Z2N3emJsbmhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyMzU0MiwiZXhwIjoyMDg5Njk5NTQyfQ.0cdSqmzxO-rpW_wbjhQmzBE58p0vVXcyIVGS9tHC5Mk";

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
