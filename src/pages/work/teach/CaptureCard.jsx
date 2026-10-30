// The capture card in the wizard's Steps phase: "Record a demonstration" live,
// or "Import a recording" the trainer already has. Holds only which of the two is
// showing; each panel owns its run and reports when it is busy so the wizard can
// hold navigation.
import React, { useState } from 'react'
import RecordPanel from './RecordPanel.jsx'
import ImportPanel from './ImportPanel.jsx'

export default function CaptureCard({ mask, language, onSteps, onBusyChange }) {
  const [mode, setMode] = useState('record')
  return mode === 'import'
    ? <ImportPanel mask={mask} language={language} onSteps={onSteps} onBusyChange={onBusyChange} onBack={() => setMode('record')} />
    : <RecordPanel mask={mask} language={language} onSteps={onSteps} onBusyChange={onBusyChange} onImport={() => setMode('import')} />
}
