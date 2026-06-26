import { BackButton } from '../../components/PageFormatting/BackButton'
import { useFunMode } from '../../contexts/useFunMode'
import { Mode } from './image-encoder.types'
import { useImageEncoder } from './useImageEncoder'
import { copy } from './data'
import { Segmented } from './components/Segmented/Segmented'
import { EncodePanel } from './components/EncodePanel/EncodePanel'
import { DecodePanel } from './components/DecodePanel/DecodePanel'
import styles from './ImageEncoder.module.scss'

const modeSegments = [
  { value: Mode.encode, label: 'Hide' },
  { value: Mode.decode, label: 'Reveal' },
]

export function ImageEncoder() {
  const { isFunMode } = useFunMode()
  const encoder = useImageEncoder()

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
        value={encoder.mode}
        onChange={encoder.setMode}
      />

      {encoder.mode === Mode.encode ? (
        <EncodePanel
          source={encoder.source}
          message={encoder.message}
          base={encoder.base}
          useKey={encoder.useKey}
          passphrase={encoder.passphrase}
          capacity={encoder.capacity}
          encoded={encoder.encoded}
          diffUrl={encoder.diffUrl}
          showDiff={encoder.showDiff}
          busy={encoder.busy}
          error={encoder.error}
          onFile={encoder.loadImage}
          onMessage={encoder.setMessage}
          onBase={encoder.setBase}
          onToggleKey={encoder.setUseKey}
          onPassphrase={encoder.setPassphrase}
          onEncode={encoder.runEncode}
          onDownload={encoder.downloadEncoded}
          onShowDiff={encoder.setShowDiff}
        />
      ) : (
        <DecodePanel
          source={encoder.source}
          decoded={encoder.decoded}
          passphrase={encoder.passphrase}
          busy={encoder.busy}
          error={encoder.error}
          onFile={encoder.loadImage}
          onPassphrase={encoder.setPassphrase}
          onSubmitKey={encoder.submitKey}
        />
      )}

      <p className={styles.privacy}>{copy.privacy}</p>
    </div>
  )
}
