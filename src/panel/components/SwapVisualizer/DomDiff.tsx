function diffLines(before: string, after: string): Array<{ type: 'same' | 'added' | 'removed'; text: string }> {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  const result: Array<{ type: 'same' | 'added' | 'removed'; text: string }> = []

  const beforeSet = new Set(beforeLines)
  const afterSet = new Set(afterLines)

  // Simple line-by-line diff (not LCS, but good enough for most swaps)
  let bi = 0
  let ai = 0

  while (bi < beforeLines.length || ai < afterLines.length) {
    if (bi < beforeLines.length && ai < afterLines.length && beforeLines[bi] === afterLines[ai]) {
      result.push({ type: 'same', text: beforeLines[bi] })
      bi++
      ai++
    } else if (bi < beforeLines.length && !afterSet.has(beforeLines[bi])) {
      result.push({ type: 'removed', text: beforeLines[bi] })
      bi++
    } else if (ai < afterLines.length && !beforeSet.has(afterLines[ai])) {
      result.push({ type: 'added', text: afterLines[ai] })
      ai++
    } else {
      // Mismatch: show as removed + added
      if (bi < beforeLines.length) {
        result.push({ type: 'removed', text: beforeLines[bi] })
        bi++
      }
      if (ai < afterLines.length) {
        result.push({ type: 'added', text: afterLines[ai] })
        ai++
      }
    }
  }

  return result
}

const LINE_COLORS = {
  same: 'transparent',
  added: 'rgba(34, 197, 94, 0.15)',
  removed: 'rgba(239, 68, 68, 0.15)',
}

const LINE_PREFIX = {
  same: ' ',
  added: '+',
  removed: '-',
}

export function DomDiff({ before, after }: { before: string; after: string }) {
  const lines = diffLines(before, after)

  return (
    <pre style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      lineHeight: '1.5',
      overflow: 'auto',
      maxHeight: '400px',
      margin: 0,
    }}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            background: LINE_COLORS[line.type],
            padding: '0 8px',
            color: line.type === 'removed' ? 'var(--error)' : line.type === 'added' ? 'var(--success)' : 'var(--text-primary)',
          }}
        >
          <span style={{ color: 'var(--text-muted)', marginRight: '8px', userSelect: 'none' }}>
            {LINE_PREFIX[line.type]}
          </span>
          {line.text}
        </div>
      ))}
    </pre>
  )
}
