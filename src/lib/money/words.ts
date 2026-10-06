// Amounts in words for GST invoices (CGST Rules, rule 46 practice): Indian grouping, so
// ₹1,23,45,678.50 reads "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred
// Seventy Eight and Fifty Paise Only".

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowHundred(n: number): string {
  if (n < 20) return ONES[n]!
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ')
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : '']
    .filter(Boolean)
    .join(' ')
}

/** Whole rupees in words, Indian system (crore, lakh, thousand). */
export function numberInWords(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Not a whole amount: ${value}`)
  if (value === 0) return 'Zero'
  const crore = Math.floor(value / 1_00_00_000)
  const lakh = Math.floor((value % 1_00_00_000) / 1_00_000)
  const thousand = Math.floor((value % 1_00_000) / 1000)
  const rest = value % 1000
  return [
    crore ? `${numberInWords(crore)} Crore` : '',
    lakh ? `${belowHundred(lakh)} Lakh` : '',
    thousand ? `${belowHundred(thousand)} Thousand` : '',
    rest ? belowThousand(rest) : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function rupeesInWords(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new TypeError(`Not whole paise: ${amountMinor}`)
  }
  const rupees = Math.floor(amountMinor / 100)
  const paise = amountMinor % 100
  return `Rupees ${numberInWords(rupees)}${paise ? ` and ${belowHundred(paise)} Paise` : ''} Only`
}
