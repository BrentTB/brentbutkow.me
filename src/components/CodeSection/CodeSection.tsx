import { useState } from 'react'
import styles from './CodeSection.module.scss'
import { useCopyToClipboard } from './useCopyToClipboard'

export interface CodeBlock {
  title: string
  code: string
}

interface CodeSectionProps {
  codeBlocks: CodeBlock[]
}

export function CodeSection({ codeBlocks }: CodeSectionProps) {
  const [activeTab, setActiveTab] = useState(0)
  const { copied, copy } = useCopyToClipboard()

  if (!codeBlocks || codeBlocks.length === 0) {
    return null
  }

  return (
    <div className={styles.codeSection}>
      <div className={styles.tabs}>
        {codeBlocks.map((block, index) => (
          <button
            key={index}
            className={`${styles.tab} ${activeTab === index ? styles.active : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {block.title}
          </button>
        ))}
      </div>
      <div className={styles.codeContent}>
        <button
          className={styles.copyButton}
          onClick={() => copy(codeBlocks[activeTab].code)}
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
        <pre>
          <code>{codeBlocks[activeTab].code}</code>
        </pre>
      </div>
    </div>
  )
}
