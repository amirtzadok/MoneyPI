import { describe, it, expect } from 'vitest'
import { parseLeumiHtml } from '../../src/parsers/leumiHtmlParser'

const SAMPLE_HTML = `
<html><body>
<table>
  <tr><th>תאריך</th><th>תאריך ערך</th><th>פירוט</th><th>אסמכתא</th><th>חובה</th><th>זכות</th><th>יתרה</th></tr>
  <tr><td>14/04/2026</td><td>14/04/2026</td><td>לאומי ויזה</td><td>123456</td><td>5,441.56</td><td></td><td>59,310.10</td></tr>
  <tr><td>10/04/2026</td><td>10/04/2026</td><td>משכורת</td><td>654321</td><td></td><td>20,000.00</td><td>64,751.66</td></tr>
</table>
</body></html>
`

describe('parseLeumiHtml', () => {
  it('parses debit transactions', () => {
    const result = parseLeumiHtml(SAMPLE_HTML)
    const debit = result.find(t => t.rawDescription === 'לאומי ויזה')
    expect(debit).toBeDefined()
    expect(debit!.amount).toBe(5441.56)
  })

  it('marks credits as refund paymentType', () => {
    const result = parseLeumiHtml(SAMPLE_HTML)
    const credit = result.find(t => t.rawDescription === 'משכורת')
    expect(credit).toBeDefined()
    expect(credit!.paymentType).toBe('refund')
    expect(credit!.amount).toBe(-20000)
  })

  it('parses date correctly', () => {
    const result = parseLeumiHtml(SAMPLE_HTML)
    expect(result[0].date).toBe('2026-04-14')
  })

  it('sets source to leumi_html', () => {
    const result = parseLeumiHtml(SAMPLE_HTML)
    expect(result[0].source).toBe('leumi_html')
  })
})
