import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, getDocs, collection } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

const firebaseConfig = {
  apiKey: "AIzaSyAw4ch3ezT_2wPa7TidnXRWRsuF4ojRv3Y",
  authDomain: "mitrandinplan.firebaseapp.com",
  projectId: "mitrandinplan",
  storageBucket: "mitrandinplan.firebasestorage.app",
  messagingSenderId: "1090271175226",
  appId: "1:1090271175226:web:c8c51435f5f9e3732a0b03"
};

const SUPABASE_URL = "https://lbgoihpjmlwgcwzblnhe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZ29paHBqbWx3Z2N3emJsbmhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyMzU0MiwiZXhwIjoyMDg5Njk5NTQyfQ.0cdSqmzxO-rpW_wbjhQmzBE58p0vVXcyIVGS9tHC5Mk";

const USUARIOS = [
  { firebaseUid: "YICccV4NtaWa0jy6tcv1wCzDPOf1", supabaseId: "bd520a1b-8e78-444a-8c96-3281ef55a8bc" },
];

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const sup = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrarUsuario(firebaseUid, supabaseId) {
  console.log(`\n── Migrando ${firebaseUid} → ${supabaseId}`);

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
  console.log("🚀 Iniciando migração...");
  for (const u of USUARIOS) {
    await migrarUsuario(u.firebaseUid, u.supabaseId);
  }
  console.log("\n✅ Migração concluída!");
  process.exit(0);
}

main().catch(e => { console.error("Erro:", e); process.exit(1); });
