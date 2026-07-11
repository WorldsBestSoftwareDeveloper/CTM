export type EnvironmentCategory =
  | 'floor'
  | 'wall'
  | 'corner'
  | 'doorway'
  | 'roof'
  | 'stairs'
  | 'balcony'
  | 'overhang'
  | 'props'
  | 'rocks'
  | 'decorations'
  | 'structural'

export interface EnvironmentModule {
  id: string
  file: string
  category: EnvironmentCategory
}

const moduleRoot = '/assets/environment/Medieval%20Village%20MegaKit%5BStandard%5D/glTF/'

/** Classifies every kit file from its modular naming convention. */
export function classifyEnvironmentModule(file: string): EnvironmentCategory {
  const name = file.replace(/\.gltf$/i, '')
  if (/^(Floor|HoleCover)/i.test(name)) return 'floor'
  if (/^Wall/i.test(name)) return 'wall'
  if (/^Corner/i.test(name)) return 'corner'
  if (/^(Door|DoorFrame)/i.test(name)) return 'doorway'
  if (/^Roof/i.test(name)) return 'roof'
  if (/^Stair/i.test(name)) return 'stairs'
  if (/^Balcony/i.test(name)) return 'balcony'
  if (/^Overhang/i.test(name)) return 'overhang'
  if (/^(Prop|Fence)/i.test(name)) return 'props'
  if (/(Rock|Stone|Boulder)/i.test(name)) return 'rocks'
  if (/^(Window|WindowShutters|Vine)/i.test(name)) return 'decorations'
  return 'structural'
}

function module(id: string, file: string): EnvironmentModule {
  return { id, file: `${moduleRoot}${file}`, category: classifyEnvironmentModule(file) }
}

// These representatives are selected from the inspected kit; all other kit files
// remain classifiable by classifyEnvironmentModule without being loaded into the MVP.
export const runnerEnvironmentModules = {
  floor: module('floor', 'Floor_UnevenBrick.gltf'),
  wall: module('wall', 'Wall_UnevenBrick_Straight.gltf'),
  arch: module('arch', 'Wall_Arch.gltf'),
  corner: module('corner', 'Corner_Exterior_Brick.gltf'),
  doorway: module('doorway', 'Wall_Plaster_Door_Round.gltf'),
  roof: module('roof', 'Roof_Wooden_2x1.gltf'),
  roofBroken: module('roofBroken', 'Roof_Wooden_2x1_Corner.gltf'),
  roofFront: module('roofFront', 'Roof_Front_Brick4.gltf'),
  stairs: module('stairs', 'Stairs_Exterior_Straight.gltf'),
  balcony: module('balcony', 'Balcony_Simple_Straight.gltf'),
  balconyCross: module('balconyCross', 'Balcony_Cross_Straight.gltf'),
  overhang: module('overhang', 'Overhang_UnevenBrick_Short.gltf'),
  log: module('log', 'Roof_Log.gltf'),
  debris: module('debris', 'Prop_Brick2.gltf'),
  brick4: module('brick4', 'Prop_Brick4.gltf'),
  crate: module('crate', 'Prop_Crate.gltf'),
  wagon: module('wagon', 'Prop_Wagon.gltf'),
  support: module('support', 'Prop_Support.gltf'),
  fence: module('fence', 'Prop_MetalFence_Ornament.gltf'),
  chimney: module('chimney', 'Prop_Chimney.gltf'),
  windowWall: module('windowWall', 'Wall_UnevenBrick_Window_Thin_Round.gltf'),
  vine: module('vine', 'Prop_Vine4.gltf'),
} as const

export type RunnerEnvironmentModuleId = keyof typeof runnerEnvironmentModules
