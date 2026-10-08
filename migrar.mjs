import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OLD_UID = "AvncNVVb88QU1ilAWMWNOUltV6F3";
const NEW_UID = "0eb4950a-bc4b-4d83-8977-3d353d28f7a2";

async function migrar() {
  console.log("Iniciando migração...");

  // 1. Copia documento principal do usuário
  const userDoc = await getDoc(doc(db, "usuarios", OLD_UID));
  if (userDoc.exists()) {
    await setDoc(doc(db, "usuarios", NEW_UID), userDoc.data());
    console.log("✓ Dados do usuário copiados");
  }

  // 2. Copia diário
  const diario = await getDocs(collection(db, "usuarios", OLD_UID, "diario"));
  let count = 0;
  for (const d of diario.docs) {
    await setDoc(doc(db, "usuarios", NEW_UID, "diario", d.id), d.data());
    count++;
  }
  console.log(`✓ ${count} entradas do diário copiadas`);

  // 3. Copia estratégias
  const ests = await getDocs(collection(db, "usuarios", OLD_UID, "estrategias"));
  let estCount = 0;
  for (const d of ests.docs) {
    await setDoc(doc(db, "usuarios", NEW_UID, "estrategias", d.id), d.data());
    estCount++;
  }
  console.log(`✓ ${estCount} estratégias copiadas`);

  console.log("✅ Migração concluída! Atualize a página do app.");
  process.exit(0);
}

migrar().catch(e => { console.error("Erro:", e); process.exit(1); });
