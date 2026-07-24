/**
 * Render-free channel between the voice control and the ambient shader.
 * The background's draw loop reads `active` every frame to drive its
 * parting uniform — no React state, no re-renders, just a shared flag,
 * mirroring how the mic level travels through `levelRef`.
 */
export const auraBus = { active: false }
