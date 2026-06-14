// Generates assets/silent.wav (1s silence) and assets/alarm.wav (0.6s 880Hz beep)
const fs = require('fs')
const path = require('path')

function makeWav(samples, sampleRate = 44100) {
  const dataSize = samples.length * 2
  const buf = Buffer.alloc(44 + dataSize)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)  // PCM
  buf.writeUInt16LE(1, 22)  // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2)
  }
  return buf
}

const SR = 44100

// 1-second silence
const silent = new Float32Array(SR)
fs.writeFileSync(path.join(__dirname, '../assets/silent.wav'), makeWav(silent, SR))

// 0.6s 880Hz beep with fade-out
const alarmLen = Math.round(SR * 0.6)
const alarm = new Float32Array(alarmLen)
for (let i = 0; i < alarmLen; i++) {
  const fade = 1 - i / alarmLen
  alarm[i] = Math.sin(2 * Math.PI * 880 * i / SR) * 0.85 * fade
}
fs.writeFileSync(path.join(__dirname, '../assets/alarm.wav'), makeWav(alarm, SR))

console.log('Generated assets/silent.wav and assets/alarm.wav')
