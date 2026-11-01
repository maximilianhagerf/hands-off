import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { CameraView, useCameraPermissions } from 'expo-camera'

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function HomeScreen({ playerName, onNameSave, playerId, onEnterRoom }) {
  const [name, setName] = useState(playerName)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

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

  async function joinRoom(overrideCode) {
    if (!name.trim()) return setError('Enter your name first')
    const code = (overrideCode ?? joinCode).trim().toUpperCase()
    if (!code) return setError('Enter room code')
    setLoading(true)
    setError('')
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

  async function handleScanPress() {
    if (!name.trim()) return setError('Enter your name first')
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) return setError('Camera permission required to scan')
    }
    setScanned(false)
    setShowScanner(true)
  }

  function handleBarcodeScanned({ data }) {
    if (scanned) return
    setScanned(true)
    setShowScanner(false)
    joinRoom(data.trim().toUpperCase())
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
            style={[s.btnScan, loading && s.btnDisabled]}
            onPress={handleScanPress}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={s.btnScanText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btnJoin, loading && s.btnDisabled]}
            onPress={() => joinRoom()}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={s.btnJoinText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={s.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
          <View style={s.scannerOverlay}>
            <Text style={s.scannerLabel}>Point at the room QR code</Text>
            <TouchableOpacity style={s.btnCancel} onPress={() => setShowScanner(false)}>
              <Text style={s.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  btnScan: {
    backgroundColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnScanText: { fontSize: 18 },
  btnJoin: {
    backgroundColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnJoinText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannerLabel: { color: '#fff', fontSize: 16, marginBottom: 20, opacity: 0.8 },
  btnCancel: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  btnCancelText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
