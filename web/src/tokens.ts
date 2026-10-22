// Night Glass tokens (docs/handoff/design-v2.md s3); keep in step with index.css. For R3F materials.
// The city is drawn at night by default so it sits under the dark glass; ?night=0 brings back the daytime map.
const night = typeof location === 'undefined' || new URLSearchParams(location.search).get('night') !== '0'

const ui = {
  bg: '#05070a',
  line: '#3a4656',
  action: '#3d8bff',
  slab: '#262b33',
  slabTop: '#3a414b',
  ground: '#13161b',
  ink: '#eef2f6',
  surface: '#0c0f14',
  muted: '#8b95a3',
  danger: '#ff4d4f',
  caution: '#ffb020',
}

// city context, flat map style: the hero keeps the brighter outline so it reads first
const day = {
  sky: '#dfe6ed',
  land: '#ebe7e0',
  sidewalk: '#d6d1c8',
  street: '#fbfbf9',
  park: '#cde2bd',
  roof: '#d3cfc8',
  cityGlass: '#93a3b4',
  cityLabel: '#6f747b',
  // stucco, sandstone, tan, brick, curtain-wall glass, concrete; picked per building
  walls: ['#ece7dd', '#ddd2c2', '#cdbba5', '#bf9f86', '#a9bacb', '#d2d5d8'],
  heroGlass: '#74879b',
  facade: '#d9c6a5', // hero walls: cream terracotta piers (140 New Montgomery)
}
const dark: typeof day = {
  sky: '#070b11',
  land: '#0c1118',
  sidewalk: '#141b24',
  street: '#1b2430',
  park: '#0f1d17',
  roof: '#1a222d',
  cityGlass: '#2a3a4d',
  cityLabel: '#4c5868',
  walls: ['#1c242f', '#202935', '#232c38', '#1a212b', '#263447', '#1e2631'],
  heroGlass: '#3b5574',
  facade: '#cdb38a', // the hero stays warm so it reads first against the night city
}

export const fs = { ...ui, ...(night ? dark : day), night }
