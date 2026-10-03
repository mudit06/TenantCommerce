import { describe, expect, it } from 'vitest'

import { addDays, addMonths, calendarDaysBetween, formatDate, startOfDay } from '@/lib/dates'

describe('dates on the Asia/Kolkata calendar', () => {
  it('starts the day at midnight IST', () => {
    // 2 Oct 20:00 UTC is already 3 Oct 01:30 in India
    expect(startOfDay(new Date('2026-10-02T20:00:00Z')).toISOString()).toBe(
      '2026-10-02T18:30:00.000Z',
    )
  })

  it('adds calendar months with end-of-month clamping', () => {
    const jan31 = new Date('2027-01-30T18:30:00Z') // 31 Jan 2027 00:00 IST
    expect(formatDate(addMonths(jan31, 1))).toBe('28 Feb 2027')
    const oct1 = new Date('2026-09-30T18:30:00Z')
    expect(addMonths(oct1, 1).toISOString()).toBe('2026-10-31T18:30:00.000Z') // 1 Nov IST
    expect(formatDate(addMonths(oct1, 12))).toBe('1 Oct 2027')
  })

  it('counts calendar days, not 24-hour blocks', () => {
    const lateNight = new Date('2026-10-03T18:00:00Z') // 3 Oct 23:30 IST
    const nextMorning = new Date('2026-10-03T19:00:00Z') // 4 Oct 00:30 IST
    expect(calendarDaysBetween(lateNight, nextMorning)).toBe(1)
    expect(formatDate(addDays(lateNight, -1))).toBe('2 Oct 2026')
  })
})
