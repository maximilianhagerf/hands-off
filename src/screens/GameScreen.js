import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, AppState,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native'
import { doc, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore'
import * as Haptics from 'expo-haptics'
import QRCode from 'react-native-qrcode-svg'
import { db } from '../firebase'
import dares from '../dares.json'

function pickDare(category) {
  const list = dares[category] || dares.kids
  return list[Math.floor(Math.random() * list.length)]
}

export default function GameScreen({ roomCode, playerId, playerName, onLeave }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const hasLostRef = useRef(false)
  const hasGoneBackgroundRef = useRef(false)
  const currentStatusRef = useRef(null)
  const currentCategoryRef = useRef('kids')
  const appStateRef = useRef(AppState.currentState)

  // Firebase listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sessions', roomCode), (snap) => {
      if (!snap.exists()) { onLeave(); return }
      const data = snap.data()

      // Triple heavy pulse for everyone when someone loses
      if (data.status === 'dare' && currentStatusRef.current !== 'dare') {
        ;(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          await new Promise(r => setTimeout(r, 100))
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          await new Promise(r => setTimeout(r, 100))
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        })()
      }

      currentStatusRef.current = data.status
      currentCategoryRef.current = data.category || 'kids'

      if (data.status === 'playing') {
        hasLostRef.current = false
        hasGoneBackgroundRef.current = false
      }

      setSession(data)
      setLoading(false)
    })
    return () => unsub()
  }, [roomCode])

  // AppState unlock detection
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState

      if (currentStatusRef.current !== 'playing' || hasLostRef.current) return

      if (nextState === 'background') {
        hasGoneBackgroundRef.current = true
      }

      if (nextState === 'active' && hasGoneBackgroundRef.current) {
        if (hasLostRef.current) return
        hasLostRef.current = true
        const sessionRef = doc(db, 'sessions', roomCode)
        runTransaction(db, async (tx) => {
          const snap = await tx.get(sessionRef)
          if (!snap.exists() || snap.data().status !== 'playing') return
          tx.update(sessionRef, {
            status: 'dare',
            loserId: playerId,
            loserName: playerName,
            currentDare: pickDare(currentCategoryRef.current),
          })
        }).catch(() => { hasLostRef.current = false })
      }
    })
    return () => sub.remove()
  }, [roomCode, playerId, playerName])

  const isAdmin = session?.adminId === playerId

  async function startRound() {
    await updateDoc(doc(db, 'sessions', roomCode), {
      status: 'playing',
      round: (session.round || 0) + 1,
      loserId: null,
      loserName: null,
      currentDare: null,
    })
  }

  async function nextRound() {
    await updateDoc(doc(db, 'sessions', roomCode), {
      status: 'playing',
      round: (session.round || 0) + 1,
      loserId: null,
      loserName: null,
      currentDare: null,
    })
  }

  async function backToLobby() {
    await updateDoc(doc(db, 'sessions', roomCode), {
      status: 'lobby',
      loserId: null,
      loserName: null,
      currentDare: null,
    })
  }

  async function setCategory(cat) {
    await updateDoc(doc(db, 'sessions', roomCode), { category: cat })
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#71717a" />
      </View>
    )
  }

  if (session.status === 'lobby') {
    return (
      <LobbyView
        session={session}
        roomCode={roomCode}
        isAdmin={isAdmin}
        onStart={startRound}
        onCategoryChange={setCategory}
        onLeave={onLeave}
      />
    )
  }
  if (session.status === 'playing') {
    return <PlayingView session={session} />
  }
  if (session.status === 'dare') {
    return (
      <DareView
        session={session}
        playerId={playerId}
        isAdmin={isAdmin}
        onNextRound={nextRound}
        onBackToLobby={backToLobby}
      />
    )
  }
  return null
}

function LobbyView({ session, roomCode, isAdmin, onStart, onCategoryChange, onLeave }) {
  const players = Object.entries(session.players || {})
  const categories = [
    { id: 'kids', label: '👶 Kids' },
    { id: 'party', label: '🎉 Party' },
    { id: 'adult', label: '🔥 Adult' },
  ]

  return (
    <ScrollView style={s.container} contentContainerStyle={s.lobbyContent}>
      <TouchableOpacity style={s.leaveBtn} onPress={onLeave}>
        <Text style={s.leaveBtnText}>← Leave</Text>
      </TouchableOpacity>

      <Text style={s.roomLabel}>Room Code</Text>
      <Text style={s.roomCode}>{roomCode}</Text>

      <View style={s.qrWrap}>
        <QRCode value={roomCode} size={140} backgroundColor="#fff" />
      </View>

      <Text style={s.sectionLabel}>Players ({players.length})</Text>
      {players.map(([id, p]) => (
        <View key={id} style={s.playerRow}>
          <View style={s.playerDot} />
          <Text style={s.playerName}>{p.name}</Text>
          {session.adminId === id && <Text style={s.hostBadge}>host</Text>}
        </View>
      ))}

      {isAdmin && (
        <>
          <Text style={[s.sectionLabel, { marginTop: 20 }]}>Dare Category</Text>
          <View style={s.catRow}>
            {categories.map(({ id, label }) => (
              <TouchableOpacity
                key={id}
                style={[s.catBtn, session.category === id && s.catBtnActive]}
                onPress={() => onCategoryChange(id)}
                activeOpacity={0.8}
              >
                <Text style={[s.catBtnText, session.category === id && s.catBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.btnPrimary, players.length < 2 && s.btnDisabled]}
            onPress={onStart}
            disabled={players.length < 2}
            activeOpacity={0.8}
          >
            <Text style={s.btnPrimaryText}>Start Game</Text>
          </TouchableOpacity>
          {players.length < 2 && (
            <Text style={s.hint}>Need at least 2 players</Text>
          )}
        </>
      )}

      {!isAdmin && (
        <Text style={s.waitingText}>Waiting for host to start...</Text>
      )}
    </ScrollView>
  )
}

function PlayingView({ session }) {
  return (
    <View style={[s.container, s.center]}>
      <Text style={s.bigEmoji}>🔒</Text>
      <Text style={s.playingTitle}>Lock Your Phone.</Text>
      <Text style={s.playingSubtitle}>First one to unlock loses and gets a dare.</Text>
      <Text style={s.roundLabel}>Round {session.round}</Text>
    </View>
  )
}

function DareView({ session, playerId, isAdmin, onNextRound, onBackToLobby }) {
  const isLoser = session.loserId === playerId

  return (
    <View style={[s.container, s.center, { paddingHorizontal: 24 }]}>
      <Text style={s.bigEmoji}>{isLoser ? '😱' : '😂'}</Text>

      <Text style={[s.dareTitle, isLoser && { color: '#f87171' }]}>
        {isLoser ? 'YOU PICKED IT UP!' : `${session.loserName} unlocked!`}
      </Text>
      <Text style={s.roundLabel}>Round {session.round}</Text>

      <View style={s.dareCard}>
        <Text style={s.dareCardLabel}>Dare</Text>
        <Text style={s.dareCardText}>{session.currentDare}</Text>
      </View>

      {(isAdmin || isLoser) ? (
        <View style={{ width: '100%', gap: 12 }}>
          <TouchableOpacity style={s.btnPrimary} onPress={onNextRound} activeOpacity={0.8}>
            <Text style={s.btnPrimaryText}>Next Round</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} onPress={onBackToLobby} activeOpacity={0.8}>
            <Text style={s.btnSecondaryText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={s.waitingText}>Waiting for next round...</Text>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  center: { justifyContent: 'center', alignItems: 'center' },
  lobbyContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  leaveBtn: { marginBottom: 16 },
  leaveBtnText: { color: '#71717a', fontSize: 14 },

  roomLabel: { color: '#71717a', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 },
  roomCode: { color: '#fb923c', fontSize: 44, fontWeight: '900', letterSpacing: 6, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 20 },

  qrWrap: { alignItems: 'center', marginBottom: 28, backgroundColor: '#fff', alignSelf: 'center', padding: 12, borderRadius: 16 },

  sectionLabel: { color: '#71717a', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },

  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 6, gap: 10 },
  playerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  playerName: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  hostBadge: { color: '#52525b', fontSize: 12 },

  catRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  catBtn: { flex: 1, backgroundColor: '#27272a', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  catBtnActive: { backgroundColor: '#f97316' },
  catBtnText: { color: '#71717a', fontSize: 13, fontWeight: '600' },
  catBtnTextActive: { color: '#fff' },

  btnPrimary: { backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 16, alignItems: 'center', width: '100%' },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  btnSecondary: { backgroundColor: '#27272a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', width: '100%' },
  btnSecondaryText: { color: '#71717a', fontWeight: '600', fontSize: 15 },

  hint: { color: '#52525b', fontSize: 12, textAlign: 'center', marginTop: 6 },
  waitingText: { color: '#52525b', fontSize: 14, marginTop: 20 },

  bigEmoji: { fontSize: 72, marginBottom: 16 },
  playingTitle: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  playingSubtitle: { color: '#71717a', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  roundLabel: { color: '#3f3f46', fontSize: 13, marginBottom: 16 },

  dareTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  dareCard: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 24, width: '100%', marginBottom: 28 },
  dareCardLabel: { color: '#52525b', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 10 },
  dareCardText: { color: '#fff', fontSize: 18, fontWeight: '600', lineHeight: 26, textAlign: 'center' },
})
