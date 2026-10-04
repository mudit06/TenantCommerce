import { describe, expect, it } from 'vitest'

import {
  addDays,
  addMonths,
  calendarDaysBetween,
  formatDate,
  formatDateAndTime,
  formatRelative,
  startOfDay,
} from '@/lib/dates'

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

describe('relative dates for the CMS (Pages, dashboard activity)', () => {
  const now = new Date('2026-10-03T06:00:00Z') // 3 Oct 11:30 IST
  it('says minutes ago, then the day in words', () => {
    expect(formatRelative(new Date('2026-10-03T05:59:40Z'), now)).toBe('Just now')
    expect(formatRelative(new Date('2026-10-03T05:50:00Z'), now)).toBe('10 minutes ago')
    expect(formatRelative(new Date('2026-10-03T03:00:00Z'), now)).toBe('Today, 08:30')
    expect(formatRelative(new Date('2026-10-02T12:40:00Z'), now)).toBe('Yesterday, 18:10')
    expect(formatRelative(new Date('2026-10-04T04:30:00Z'), now)).toBe('Tomorrow, 10:00')
    expect(formatRelative(new Date('2026-09-20T04:30:00Z'), now)).toBe('20 Sept 2026')
  })
  it('shows a scheduled moment with its date and time', () => {
    expect(formatDateAndTime(new Date('2026-10-31T18:30:00Z'))).toBe('1 Nov 2026 · 00:00')
  })
})
