import { useState } from 'react'
import { BackButton } from '../../components/PageFormatting/BackButton'
import { useFunMode } from '../../contexts/useFunMode'
import { Mode } from './image-encoder.types'
import { copy } from './data'
import { Segmented } from './components/Segmented/Segmented'
import { EncodePanel } from './components/EncodePanel/EncodePanel'
import { DecodePanel } from './components/DecodePanel/DecodePanel'
import { HowItWorks } from './components/HowItWorks/HowItWorks'
import styles from './ImageEncoder.module.scss'

const modeSegments = [
  { value: Mode.encode, label: 'Hide' },
  { value: Mode.decode, label: 'Reveal' },
]

export function ImageEncoder() {
  const { isFunMode } = useFunMode()
  // Both panels stay mounted; switching tabs only changes which one is shown, so
  // each keeps its own image, message, and result.
  const [mode, setMode] = useState<Mode>(Mode.encode)

  return (
    <div className={styles.wrapper}>
      <BackButton />

      <header className={styles.intro}>
        <h1 className={styles.title}>Image Encoder</h1>
        <p className={styles.tagline}>{isFunMode ? copy.taglineFun : copy.tagline}</p>
      </header>

      <Segmented
        ariaLabel="Hide or reveal a message"
        options={modeSegments}
        value={mode}
        onChange={setMode}
      />

      <div className={styles.panelHost} hidden={mode !== Mode.encode}>
        <EncodePanel />
      </div>
      <div className={styles.panelHost} hidden={mode !== Mode.decode}>
        <DecodePanel />
      </div>

      <HowItWorks />

      <p className={styles.privacy}>{copy.privacy}</p>
    </div>
  )
}
