/**
 * 台風バナーのテスト用データをFirestoreに投入するスクリプト
 *
 * 使い方:
 *   npm run seed:typhoon
 *
 * 削除方法: Firestoreコンソールから手動で typhoons/{year}/list/typhoon-test-4 を削除
 */

import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

async function seedTyphoonTest() {
  if (!firebaseConfig.projectId) {
    console.error('❌ Firebase環境変数が設定されていません。.env.localを確認してください。')
    process.exit(1)
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  const auth = getAuth(app)
  const db = getFirestore(app)

  // 匿名認証
  await signInAnonymously(auth)

  const year = String(new Date().getFullYear())
  const typhoonId = 'typhoon-test-4'
  const now = Date.now()

  const data = {
    name: '台風4号',
    number: 4,
    position: { lat: 8.3, lon: 149.9 },
    pressure: 990,
    windSpeed: 23,
    forecastPath: [
      { lat: 8.3, lon: 149.9, time: new Date(now).toISOString(), pressure: 990, windSpeed: 23 },
      { lat: 9.0, lon: 146.0, time: new Date(now + 86400000).toISOString(), pressure: 985, windSpeed: 25 },
      { lat: 10.5, lon: 142.0, time: new Date(now + 172800000).toISOString(), pressure: 980, windSpeed: 28 },
      { lat: 13.0, lon: 138.0, time: new Date(now + 259200000).toISOString(), pressure: 975, windSpeed: 30 },
    ],
    isActive: true,
    isWithin800km: true, // テスト用に強制true
    updatedAt: new Date().toISOString(),
  }

  const ref = doc(db, 'typhoons', year, 'list', typhoonId)
  await setDoc(ref, data)

  console.log(`✅ テストデータを投入しました: typhoons/${year}/list/${typhoonId}`)
  console.log(`   name: ${data.name}`)
  console.log(`   isActive: ${data.isActive}, isWithin800km: ${data.isWithin800km}`)
  process.exit(0)
}

seedTyphoonTest().catch(err => {
  console.error('❌ エラー:', err)
  process.exit(1)
})
