import { describe, expect, it } from 'vitest'

import { scopedToTenants } from '@/access'
import { attributeSetProblems, optionValueFrom } from '@/modules/catalog/services/attributeSets'
import {
  mailtoLink,
  replyText,
  whatsappLink,
  whatsappNumber,
} from '@/modules/enquiries/services/reply'

describe('scopedToTenants (create and update target store)', () => {
  it('limits reads to the stores and refuses writes into any other store', () => {
    expect(scopedToTenants('tenant', ['a', 'b'])).toEqual({ tenant: { in: ['a', 'b'] } })
    expect(scopedToTenants('tenant', ['a'], { tenant: 'a' })).toEqual({ tenant: { in: ['a'] } })
    expect(scopedToTenants('tenant', ['a'], { tenant: { id: 'b' } })).toBe(false)
    expect(scopedToTenants('tenant', [], { tenant: 'a' })).toBe(false)
    // Updates that don't move the document keep the query constraint
    expect(scopedToTenants('tenant', ['a'], { name: 'x' })).toEqual({ tenant: { in: ['a'] } })
  })
})

describe('attribute sets', () => {
  it('accepts a sanitary-ware set', () => {
    expect(
      attributeSetProblems([
        {
          code: 'finish',
          label: 'Finish',
          type: 'color',
          isVariantAxis: true,
          options: [{ value: 'chrome', label: 'Chrome' }],
        },
        { code: 'flow_rate', label: 'Flow rate', type: 'number' },
        {
          code: 'mounting',
          label: 'Mounting',
          type: 'select',
          options: [{ value: 'deck', label: 'Deck' }],
        },
      ]),
    ).toEqual([])
  })

  it('names each problem in words a vendor understands', () => {
    const problems = attributeSetProblems([
      { code: 'Flow Rate', label: 'Flow rate', type: 'number' },
      { code: 'size', label: 'Size', type: 'select', options: [{ value: 'M', label: 'Medium' }] },
      { code: 'size', label: 'Size again', type: 'text' },
    ])
    expect(problems).toEqual([
      expect.stringMatching(/^Flow rate: the code must start with a letter/),
      expect.stringMatching(/^Size: option "Medium" needs a value/),
      'Size again: the code "size" is used twice',
    ])
  })

  it('makes option values from labels', () => {
    expect(optionValueFrom('Matt Black')).toBe('matt-black')
    expect(optionValueFrom(' Rosé gold! ')).toBe('rose-gold')
  })
})

describe('enquiry replies', () => {
  it('turns Indian numbers into WhatsApp numbers', () => {
    expect(whatsappNumber('98250 12345')).toBe('919825012345')
    expect(whatsappNumber('098250-12345')).toBe('919825012345')
    expect(whatsappNumber('+91 98250 12345')).toBe('919825012345')
    expect(whatsappNumber('+44 20 7946 0958')).toBe('442079460958')
    expect(whatsappNumber('12345')).toBeNull()
    expect(whatsappNumber(undefined)).toBeNull()
  })

  it('builds reply links with the reference and store name', () => {
    const text = replyText({
      name: 'Rakesh Mehta',
      referenceNumber: 'ENQ-12',
      storeName: 'Aquaverde',
    })
    expect(text.subject).toBe('Your enquiry (ENQ-12) · Aquaverde')
    expect(text.body.startsWith('Hello Rakesh,')).toBe(true)
    expect(whatsappLink('9825012345', 'Hi')).toBe('https://wa.me/919825012345?text=Hi')
    expect(mailtoLink('a@b.in', 'S u', 'B')).toBe('mailto:a@b.in?subject=S%20u&body=B')
    expect(mailtoLink('not-an-email', 'S', 'B')).toBeNull()
  })
})
