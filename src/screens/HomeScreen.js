import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function HomeScreen({ playerName, onNameSave, playerId, onEnterRoom }) {
  const [name, setName] = useState(playerName)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createRoom() {
    if (!name.trim()) return setError('Enter your name first')
    setLoading(true)
    setError('')
    await onNameSave(name.trim())
    const roomCode = generateRoomCode()
    await setDoc(doc(db, 'sessions', roomCode), {
      adminId: playerId,
      category: 'kids',
      status: 'lobby',
      round: 0,
      loserId: null,
      loserName: null,
      currentDare: null,
      players: { [playerId]: { name: name.trim() } },
    })
    setLoading(false)
    onEnterRoom(roomCode)
  }

  async function joinRoom() {
    if (!name.trim()) return setError('Enter your name first')
    if (!joinCode.trim()) return setError('Enter room code')
    setLoading(true)
    setError('')
    const code = joinCode.trim().toUpperCase()
    await onNameSave(name.trim())
    const snap = await getDoc(doc(db, 'sessions', code))
    if (!snap.exists()) {
      setError('Room not found')
      setLoading(false)
      return
    }
    await updateDoc(doc(db, 'sessions', code), {
      [`players.${playerId}`]: { name: name.trim() },
    })
    setLoading(false)
    onEnterRoom(code)
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.emoji}>🙌</Text>
          <Text style={s.title}>Hands Off</Text>
          <Text style={s.subtitle}>First to unlock their phone loses.</Text>
        </View>

        <TextInput
          style={s.input}
          placeholder="Your name"
          placeholderTextColor="#71717a"
          value={name}
          onChangeText={t => { setName(t); setError('') }}
          autoCapitalize="words"
        />

        {!!error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity
          style={[s.btnPrimary, loading && s.btnDisabled]}
          onPress={createRoom}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnPrimaryText}>Create Room</Text>
          }
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or join existing</Text>
          <View style={s.dividerLine} />
        </View>

        <View style={s.joinRow}>
          <TextInput
            style={[s.input, s.codeInput]}
            placeholder="ROOM CODE"
            placeholderTextColor="#71717a"
            value={joinCode}
            onChangeText={t => { setJoinCode(t.toUpperCase()); setError('') }}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[s.btnJoin, loading && s.btnDisabled]}
            onPress={joinRoom}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={s.btnJoinText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#71717a', marginTop: 4 },
  input: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  error: { color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  btnPrimary: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#27272a' },
  dividerText: { color: '#52525b', fontSize: 12, marginHorizontal: 12 },
  joinRow: { flexDirection: 'row', gap: 8 },
  codeInput: {
    flex: 1,
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 0,
  },
  btnJoin: {
    backgroundColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnJoinText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
