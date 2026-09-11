/**
 * The porthole's dimensions, shared by the window itself and the route
 * drawn on its glass so both author in the same px space.
 */
export const PORTHOLE_W = 236
export const PORTHOLE_H = 310
export const FRAME = 13
export const WELL = 8
export const GLASS_W = PORTHOLE_W - 2 * (FRAME + WELL) // 194
export const GLASS_H = PORTHOLE_H - 2 * (FRAME + WELL) // 268
/** Airliner-window silhouette: fully rounded ends, short straight sides. */
export const SHAPE = '50% / 40%'
/** The glass outline's radii — SHAPE resolved: half the width, 40% of the height. */
export const GLASS_RX = GLASS_W / 2 // 97
export const GLASS_RY = GLASS_H * 0.4 // 107.2
