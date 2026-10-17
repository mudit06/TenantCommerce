import { describe, expect, it } from 'vitest'

import { parseCsv } from '@/lib/csv'
import { readPincodeDirectory, titleCase } from '@/modules/shipping/services/pincodeDirectory'

// The pincode directory import (docs/06 `pincodes`): both releases of the government's file, one
// row per pincode, its state by GST code whatever the spelling, and only real coordinates kept.

const CURRENT = `circlename,regionname,divisionname,officename,pincode,officetype,delivery,district,statename,latitude,longitude
Delhi Circle,Delhi Region,New Delhi Central Division,Connaught Place S.O,110001,S.O,Delivery,NEW DELHI,DELHI,28.6304,77.2177
Delhi Circle,Delhi Region,New Delhi Central Division,Baroda House S.O,110001,S.O,Non Delivery,NEW DELHI,DELHI,NA,NA
Maharashtra Circle,Pune Region,Pune City West Division,Baner S.O,411045,S.O,Delivery,PUNE,MAHARASHTRA,NA,NA
Maharashtra Circle,Pune Region,Pune City West Division,Balewadi B.O,411045,B.O,Delivery,PUNE,MAHARASHTRA,18.57,73.77
Andhra Pradesh Circle,Vijayawada Region,Nellore Division,Nellore H.O,524001,H.O,Delivery,SRI POTTI SRIRAMULU NELLORE,ANDHRA PRADESH,14.44,79.98
Dadra Circle,Silvassa,Silvassa Division,Silvassa S.O,396230,S.O,Delivery,DADRA AND NAGAR HAVELI,THE DADRA AND NAGAR HAVELI AND DAMAN AND DIU,20.27,73.01
Bad,Bad,Bad,Nowhere,012345,S.O,Delivery,NOWHERE,DELHI,1,1
`

const OLDER = `officename,pincode,officeType,Deliverystatus,divisionname,regionname,circlename,Taluk,Districtname,statename
Raipur H.O,492001,H.O,Delivery,Raipur,Raipur,Chattisgarh,Raipur,Raipur,CHATTISGARH
Puducherry H.O,605001,H.O,Delivery,Pondicherry,Chennai,Tamilnadu,Puducherry,Puducherry,PONDICHERRY
Port Blair H.O,744101,H.O,Delivery,Andaman,Kolkata,West Bengal,Port Blair,South Andaman,ANDAMAN & NICOBAR ISLANDS
`

describe('pincode directory import', () => {
  it('keeps one row per pincode with the district as the city and the GST state', () => {
    const result = readPincodeDirectory(parseCsv(CURRENT))
    expect(result.offices).toBe(7)
    expect(result.skipped).toEqual({ badPincode: 1, unknownState: 0 })
    expect(result.rows).toEqual([
      {
        pincode: '110001',
        city: 'New Delhi',
        district: 'New Delhi',
        stateCode: '07',
        latitude: 28.6304,
        longitude: 77.2177,
      },
      // The first post office had no position; a later one fills it
      {
        pincode: '411045',
        city: 'Pune',
        district: 'Pune',
        stateCode: '27',
        latitude: 18.57,
        longitude: 73.77,
      },
      expect.objectContaining({ pincode: '524001', city: 'Sri Potti Sriramulu Nellore' }),
      expect.objectContaining({ pincode: '396230', stateCode: '26' }),
    ])
  })

  it('reads the older release with its own column names and spellings', () => {
    const result = readPincodeDirectory(parseCsv(OLDER))
    expect(result.rows.map((r) => [r.pincode, r.city, r.stateCode, r.latitude])).toEqual([
      ['492001', 'Raipur', '22', null],
      ['605001', 'Puducherry', '34', null],
      ['744101', 'South Andaman', '35', null],
    ])
  })

  it('falls back to the pincode’s state range, and reports a state it can’t place', () => {
    const csv = `pincode,statename,district\n110002,DELHI NCT,CENTRAL DELHI\n990001,ATLANTIS,X\n`
    const result = readPincodeDirectory(parseCsv(csv))
    expect(result.rows).toEqual([expect.objectContaining({ pincode: '110002', stateCode: '07' })])
    expect(result.unknownStates).toEqual({ ATLANTIS: 1 })
  })

  it('refuses a file that isn’t the directory', () => {
    expect(() => readPincodeDirectory(parseCsv('name,price\nTap,100\n'))).toThrow(/pincode/)
  })

  it('title-cases names', () => {
    expect(titleCase('  JAMMU AND KASHMIR ')).toBe('Jammu and Kashmir')
    expect(titleCase('NORTH-WEST DELHI')).toBe('North-West Delhi')
  })
})
