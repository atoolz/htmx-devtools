// Simple LCS-based diff for DOM snapshots
function lcs(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  // For large inputs, fall back to a simpler approach
  if (m * n > 100000) return []

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  return dp
}

function diffLines(before: string, after: string): Array<{ type: 'same' | 'added' | 'removed'; text: string }> {
  const a = before.split('\n')
  const b = after.split('\n')
  const result: Array<{ type: 'same' | 'added' | 'removed'; text: string }> = []

  const dp = lcs(a, b)

  // Fallback for large inputs: simple line-by-line comparison
  if (dp.length === 0) {
    let ai = 0
    let bi = 0
    while (ai < a.length || bi < b.length) {
      if (ai < a.length && bi < b.length && a[ai] === b[bi]) {
        result.push({ type: 'same', text: a[ai] })
        ai++; bi++
      } else if (ai < a.length) {
        result.push({ type: 'removed', text: a[ai] })
        ai++
      } else {
        result.push({ type: 'added', text: b[bi] })
        bi++
      }
    }
    return result
  }

  // Trace back through LCS table
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      result.push({ type: 'same', text: a[i] })
      i++; j++
    } else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'added', text: b[j] })
      j++
    } else {
      result.push({ type: 'removed', text: a[i] })
      i++
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
      fontSize: '12px',
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
