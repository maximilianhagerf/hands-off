import { useState, useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StatusBar } from 'expo-status-bar'
import HomeScreen from './src/screens/HomeScreen'
import GameScreen from './src/screens/GameScreen'

export default function App() {
  const [playerId, setPlayerId] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState(null)

  useEffect(() => {
    async function init() {
      let id = await AsyncStorage.getItem('playerId')
      if (!id) {
        id = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
        await AsyncStorage.setItem('playerId', id)
      }
      setPlayerId(id)
      const name = await AsyncStorage.getItem('playerName')
      if (name) setPlayerName(name)
    }
    init()
  }, [])

  async function handleNameSave(name) {
    setPlayerName(name)
    await AsyncStorage.setItem('playerName', name)
  }

  if (!playerId) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#f97316" />
        <StatusBar style="light" />
      </View>
    )
  }

  if (roomCode) {
    return (
      <>
        <GameScreen
          roomCode={roomCode}
          playerId={playerId}
          playerName={playerName}
          onLeave={() => setRoomCode(null)}
        />
        <StatusBar style="light" />
      </>
    )
  }

  return (
    <>
      <HomeScreen
        playerName={playerName}
        onNameSave={handleNameSave}
        playerId={playerId}
        onEnterRoom={(code) => setRoomCode(code)}
      />
      <StatusBar style="light" />
    </>
  )
}
