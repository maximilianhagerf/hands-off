import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCElq6gp1CA_297HXHH5Kos_FdQ5zdYOpE",
  authDomain: "hands-off-f83bc.firebaseapp.com",
  projectId: "hands-off-f83bc",
  storageBucket: "hands-off-f83bc.firebasestorage.app",
  messagingSenderId: "167792294377",
  appId: "1:167792294377:web:a5023e60924cb1f48d7378"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
