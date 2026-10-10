'use client'

import 'leaflet/dist/leaflet.css'

import type * as Leaflet from 'leaflet'
import { useEffect, useRef } from 'react'

export type MapPoint = {
  id: string
  name: string
  latitude: number
  longitude: number
  href?: string
}

const INDIA: [number, number] = [22.5, 79]

type Drawn = { map: Leaflet.Map; markers: Leaflet.Marker[] }

/** Puts the pins on the map and frames them (or the selected one). */
function drawPins(
  L: typeof Leaflet,
  drawn: Drawn,
  points: MapPoint[],
  selectedId: string | null | undefined,
  draggable: boolean,
  onMove: { current?: (latitude: number, longitude: number) => void },
) {
  for (const marker of drawn.markers) marker.remove()
  drawn.markers = points.map((point) => {
    const selected = point.id === selectedId || draggable
    const marker = L.marker([point.latitude, point.longitude], {
      draggable,
      title: point.name,
      icon: L.divIcon({
        className: `te-map-pin${selected ? ' te-map-pin--selected' : ''}`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    }).addTo(drawn.map)
    if (point.href) marker.on('click', () => window.location.assign(point.href!))
    if (draggable) {
      marker.on('dragend', () => {
        const at = marker.getLatLng()
        onMove.current?.(at.lat, at.lng)
      })
    }
    return marker
  })
  const focus = points.find((p) => p.id === selectedId) ?? (points.length === 1 ? points[0] : null)
  if (focus) drawn.map.setView([focus.latitude, focus.longitude], draggable ? 15 : 11)
  else if (points.length > 1) {
    drawn.map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])), {
      padding: [24, 24],
      maxZoom: 12,
    })
  }
}

/**
 * A map with pins (Leaflet and OpenStreetMap tiles, no API key): every shown dealer on the
 * Dealers list, or one draggable pin on a dealer's form. Loaded in the browser only.
 */
export function DealerMap({
  points,
  selectedId,
  draggable = false,
  onMove,
  height = 240,
  label,
}: {
  points: MapPoint[]
  selectedId?: string | null
  /** One pin to drag (a dealer's form); clicking the map moves it there too */
  draggable?: boolean
  onMove?: (latitude: number, longitude: number) => void
  height?: number
  label: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const drawn = useRef<Drawn | null>(null)
  const moved = useRef(onMove)

  useEffect(() => {
    moved.current = onMove
  }, [onMove])

  // The map itself, once
  useEffect(() => {
    let cancelled = false
    void import('leaflet').then((L) => {
      if (cancelled || !box.current || drawn.current) return
      const map = L.map(box.current, { scrollWheelZoom: false }).setView(INDIA, 4)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)
      if (draggable) {
        map.on('click', (event: Leaflet.LeafletMouseEvent) =>
          moved.current?.(event.latlng.lat, event.latlng.lng),
        )
      }
      drawn.current = { map, markers: [] }
      drawPins(L, drawn.current, points, selectedId, draggable, moved)
    })
    return () => {
      cancelled = true
      drawn.current?.map.remove()
      drawn.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- made once; pins redraw below
  }, [])

  // The pins, whenever they change
  useEffect(() => {
    if (!drawn.current) return
    void import('leaflet').then((L) => {
      if (drawn.current) drawPins(L, drawn.current, points, selectedId, draggable, moved)
    })
  }, [points, selectedId, draggable])

  return <div aria-label={label} className="te-map" ref={box} role="img" style={{ height }} />
}
