import { useState } from 'react'
import styles from './CodeSection.module.scss'

export interface CodeBlock {
  title: string
  code: string
}

interface CodeSectionProps {
  codeBlocks: CodeBlock[]
}

export default function CodeSection({ codeBlocks }: CodeSectionProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)

  if (!codeBlocks || codeBlocks.length === 0) {
    return null
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeBlocks[activeTab].code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
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
        <button className={styles.copyButton} onClick={handleCopy}>
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
        <pre>
          <code>{codeBlocks[activeTab].code}</code>
        </pre>
      </div>
    </div>
  )
}
