export function nextCronDate(expression: string): Date | null {
  try {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) return null
    const [minExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts

    function matches(val: number, expr: string, min: number, max: number): boolean {
      if (expr === '*') return true
      for (const part of expr.split(',')) {
        if (part.includes('/')) {
          const [rangeStr, stepStr] = part.split('/')
          const step = parseInt(stepStr)
          const from = rangeStr === '*' ? min : parseInt(rangeStr.split('-')[0] ?? '0')
          const to = rangeStr.includes('-') ? parseInt(rangeStr.split('-')[1] ?? String(max)) : max
          for (let v = from; v <= to; v += step) {
            if (v === val) return true
          }
        } else if (part.includes('-')) {
          const [a, b] = part.split('-').map(Number)
          if (val >= a && val <= b) return true
        } else {
          if (parseInt(part) === val) return true
        }
      }
      return false
    }

    const d = new Date()
    d.setSeconds(0, 0)
    d.setMinutes(d.getMinutes() + 1)

    for (let i = 0; i < 525960; i++) {
      if (
        matches(d.getMonth() + 1, monthExpr, 1, 12)
        && matches(d.getDate(), domExpr, 1, 31)
        && matches(d.getDay(), dowExpr, 0, 6)
        && matches(d.getHours(), hourExpr, 0, 23)
        && matches(d.getMinutes(), minExpr, 0, 59)
      ) {
        return new Date(d)
      }
      d.setMinutes(d.getMinutes() + 1)
    }
    return null
  } catch {
    return null
  }
}
