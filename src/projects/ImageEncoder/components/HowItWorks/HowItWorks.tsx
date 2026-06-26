import { ToggleableSection } from '../../../../components/ToggleableSection/ToggleableSection'
import styles from './HowItWorks.module.scss'

export function HowItWorks() {
  return (
    <div className={styles.howItWorks}>
      <ToggleableSection title="How this works">
        <div className={styles.body}>
          <p>
            Every pixel is three numbers: how much red, green, and blue it holds, each from 0 to
            255. Shift one of those numbers by a step or two and the color barely changes, far too
            little for your eye to notice. The whole trick is hiding a message in those tiny shifts.
          </p>

          <h4>Rounding to hide bits</h4>
          <p>
            Each channel is rounded to a multiple of the base you pick, and the leftover (the
            remainder) carries a piece of your message. Read the remainders back and the message
            reappears. To keep the picture looking untouched, each channel moves to the nearest
            value that lands on the right remainder, so it never drifts by more than a step or two.
          </p>

          <h4>Binary, ternary, quaternary</h4>
          <p>
            The base sets how much each channel holds. <code>Binary</code> stores one bit per
            channel (even or odd). <code>Quaternary</code> stores two bits, so it fits twice as much
            but moves pixels a bit more. <code>Ternary</code> sits in between. The capacity meter
            shows how much room your image gives you at each base.
          </p>

          <h4>How the image describes itself</h4>
          <p>
            The first pixels hold a small header: a marker that says a message is present, which
            base was used, whether it is encrypted, and how long the message runs. That is why
            reading any image just works. With no marker, the reader knows nothing is hidden and
            tells you, rather than spitting out noise.
          </p>

          <h4>The key</h4>
          <p>
            Turn the key on and your message is encrypted with AES-GCM before it is hidden. The key
            you type is stretched through PBKDF2 to derive the encryption key, and the random salt
            and nonce ride along in the header (neither is secret). A wrong key fails to decrypt
            cleanly instead of returning gibberish. With the key off, the message is hidden but not
            encrypted, so anyone who runs the image through this page can read it.
          </p>

          <h4>Why the download is a PNG</h4>
          <p>
            PNG keeps every pixel exactly as written. A JPEG re-compresses the image and smears
            those tiny shifts, which would wipe the message out. So the output is always a PNG.
          </p>

          <p>All of it runs in your browser. Nothing is uploaded.</p>
        </div>
      </ToggleableSection>
    </div>
  )
}
