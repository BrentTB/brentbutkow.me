import { useEffect, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { Mode } from './image-encoder.types'
import { terminateWorker } from './codec-worker-client'
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

  // The codec worker is a module-level singleton shared by both panels; release
  // it when the page unmounts so the thread doesn't outlive the route.
  useEffect(() => () => terminateWorker(), [])

  return (
    <PageLayout>
      <PageHeader title="Image Encoder">{isFunMode ? copy.taglineFun : copy.tagline}</PageHeader>

      <div className={styles.body}>
        <div className={styles.modeSwitch}>
          <Segmented
            ariaLabel="Hide or reveal a message"
            options={modeSegments}
            value={mode}
            onChange={setMode}
          />
        </div>

        <div className={styles.panelHost} hidden={mode !== Mode.encode}>
          <EncodePanel />
        </div>
        <div className={styles.panelHost} hidden={mode !== Mode.decode}>
          <DecodePanel />
        </div>

        <HowItWorks />

        <p className={styles.privacy}>{copy.privacy}</p>
      </div>
    </PageLayout>
  )
}
