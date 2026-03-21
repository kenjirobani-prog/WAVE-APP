import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// モジュール評価時ではなく、初回呼び出し時に初期化する（SSRビルドでのクラッシュを防ぐ）
let _app: FirebaseApp | null = null
let _db: Firestore | null = null
let _auth: Auth | null = null

function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  }
  return _app
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getApp())
  return _db
}

export function getAuthInstance(): Auth {
  if (!_auth) _auth = getAuth(getApp())
  return _auth
}

// 匿名ユーザーのUIDを返すPromise（重複サインインを防ぐためメモ化）
let authPromise: Promise<string> | null = null

export function ensureAnonymousAuth(): Promise<string> {
  if (authPromise) return authPromise
  const auth = getAuthInstance()
  authPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe()
      if (user) {
        resolve(user.uid)
      } else {
        try {
          const cred = await signInAnonymously(auth)
          resolve(cred.user.uid)
        } catch (err) {
          authPromise = null
          reject(err)
        }
      }
    })
  })
  return authPromise
}
