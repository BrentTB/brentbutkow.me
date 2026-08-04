import { FormEvent, useState } from 'react'
import { encodeRoomInvite } from '../../../../multiplayer/room-code'
import { Connection, OnlineRoom } from '../../../../multiplayer/useOnlineRoom'
import { gameCopy } from '../../data'
import { TIC_TAC_TOE_GAME_ID } from '../../online'
import styles from './OnlinePanel.module.scss'

interface OnlinePanelProps {
  room: OnlineRoom<number>
  /** The local player's chosen colour, sent when creating or joining. */
  colour: string
  /** A code pulled from an invite link, prefilling the join field. */
  initialCode?: string
}

/** Create or join a room, then show the code, a copy-link, and whose move it is. */
export function OnlinePanel({ room, colour, initialCode = '' }: OnlinePanelProps) {
  const [code, setCode] = useState(initialCode)
  const [copied, setCopied] = useState(false)
  const copy = gameCopy.online

  const submitJoin = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed) void room.join(trimmed, colour)
  }

  const copyLink = async () => {
    if (room.code === null) return
    const params = new URLSearchParams(
      encodeRoomInvite({ code: room.code, gameId: TIC_TAC_TOE_GAME_ID, colour })
    )
    const url = `${window.location.origin}${window.location.pathname}?${params}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied; the code is on screen to type by hand.
    }
  }

  if (room.connection === Connection.connected) {
    const turn = !room.opponentPresent
      ? copy.waiting
      : room.isMyTurn
        ? copy.yourTurn
        : copy.theirTurn
    return (
      <section className={styles.panel} aria-labelledby="online-heading">
        <h2 id="online-heading" className={styles.heading}>
          {copy.title}
        </h2>
        <div className={styles.codeRow}>
          <span className={styles.codeLabel}>{copy.yourCode}</span>
          <span className={styles.code}>{room.code}</span>
        </div>
        <button type="button" className={styles.action} onClick={copyLink}>
          {copied ? copy.copied : copy.copyLink}
        </button>
        <p className={styles.status} aria-live="polite">
          {turn}
        </p>
        <button type="button" className={styles.leave} onClick={room.leave}>
          {copy.leave}
        </button>
      </section>
    )
  }

  return (
    <section className={styles.panel} aria-labelledby="online-heading">
      <h2 id="online-heading" className={styles.heading}>
        {copy.title}
      </h2>
      <p className={styles.intro}>{copy.intro}</p>
      {room.connection === Connection.connecting ? (
        <p className={styles.status}>{copy.connecting}</p>
      ) : (
        <>
          <button type="button" className={styles.action} onClick={() => void room.create(colour)}>
            {copy.create}
          </button>
          <form className={styles.joinRow} onSubmit={submitJoin}>
            <label className={styles.codeLabel} htmlFor="room-code">
              {copy.codeLabel}
            </label>
            <div className={styles.joinControls}>
              <input
                id="room-code"
                className={styles.input}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={copy.codePlaceholder}
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <button type="submit" className={styles.action} disabled={code.trim() === ''}>
                {copy.join}
              </button>
            </div>
          </form>
        </>
      )}
      {room.error !== null && (
        <p className={styles.error} role="alert">
          {room.error}
        </p>
      )}
    </section>
  )
}
