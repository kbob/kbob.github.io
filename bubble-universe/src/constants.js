export const tau = 2 * Math.PI;

export const WINDOW_TITLE = 'Bubble Universe';
export const MAX_FPS = 60;
export const MAX_SEQ_COUNT = 2000;
export const MAX_SEQ_LENGTH = 200;
export const MAX_S_BLOCKS = 10;
export const BORDER = 0.1;
export const WORKGROUP_SIZE = 64;
export const BLEND_MODE = 'add';
export const HDR_PIXEL_FORMAT = 'rgba16float';
export const BLOOM_MIP_LEVELS = 5;

export const Theme = Object.freeze({
    Classic: 0,
    Vapor: 1,
    Midnight: 2,
    Fiesta: 3,
    Easter: 4,
    Bone: 5,
    Oscilloscope: 6,
    Triad: 7,
});

export const THEME_NAMES = ['Classic', 'Vapor', 'Midnight', 'Fiesta', 'Easter', 'Bone', 'Oscilloscope', 'Triad'];

export function colorsAnimated(themeIndex) {
    return themeIndex === Theme.Triad;
}

export function backgroundAnimated(themeIndex) {
    return themeIndex === Theme.Vapor ||
           themeIndex === Theme.Midnight ||
           themeIndex === Theme.Fiesta ||
           themeIndex === Theme.Oscilloscope;
}

function createDefaults() {
    const PARTICLE_SIZE = 3;
    return {
        CANVAS_SIZE: [675, 540],
        SEQ_COUNT: 200,
        SEQ_LENGTH: 100,
        SPEED: tau / 12.5,
        R: tau / 235,
        S: 1.0,
        S_BLOCKS: 1,
        THEME: Theme.Classic,
        PARTICLE_SIZE,
        TRAIL_PERSISTENCE: 0.4,
        TRAIL_DIFFUSION: 0.0,
        BACKGROUND_BRIGHTNESS: 1.0,
        TRAILS_BRIGHTNESS: 1.0,
        PARTICLES_BRIGHTNESS: 1.0,
        BLOOM_AMOUNT: 0.03 / PARTICLE_SIZE,
        BLOOM_SIZE: 0.005,
        TONE_MAP_BOOST: 4.0,
        TONE_MAP_WHITE: 4.0,
    }
}
export const Defaults = Object.freeze(createDefaults());

export default {
    tau,
    WINDOW_TITLE,
    MAX_FPS,
    MAX_SEQ_COUNT,
    MAX_SEQ_LENGTH,
    MAX_S_BLOCKS,
    BORDER,
    WORKGROUP_SIZE,
    BLEND_MODE,
    Defaults,
};