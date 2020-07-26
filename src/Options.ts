import {Palette} from "./ImageTracer";

export type Options = {
    corsenabled?: boolean,
    ltres?: number,
    qtres?: number,
    pathomit?: number,
    rightangleenhance?: boolean,

    // Color quantization
    colorsampling?: number,
    numberofcolors?: number,
    mincolorratio?: number,
    colorquantcycles?: number,

    // Layering method
    layering?: number,

    // SVG rendering
    strokewidth?: number,
    linefilter?: boolean,
    scale?: number,
    roundcoords?: number,
    viewbox?: boolean,
    desc?: boolean,
    lcpr?: number,
    qcpr?: number,

    // Blur
    blurradius?: number,
    blurdelta?: number

    pal?: Palette
    layercontainerid?: string
}

export const optionDefault: Options = {
    corsenabled: false,
    ltres: 1,
    qtres: 1,
    pathomit: 8,
    rightangleenhance: true,
    colorsampling: 2,
    numberofcolors: 16,
    mincolorratio: 0,
    colorquantcycles: 3,
    layering: 0,
    strokewidth: 1,
    linefilter: false,
    scale: 1,
    roundcoords: 1,
    viewbox: false,
    desc: false,
    lcpr: 0,
    qcpr: 0,
    blurradius: 0,
    blurdelta: 20
}

export const optionPosterized1: Options = {
    numberofcolors: 4,
    blurradius: 5
}

export const optionPosterized2: Options = {
    numberofcolors: 4,
    blurradius: 5
}

export const optionPosterized3: Options = {
    ltres: 1,
    qtres: 1,
    pathomit: 20,
    rightangleenhance: true,
    colorsampling: 0,
    numberofcolors: 3,
    mincolorratio: 0,
    colorquantcycles: 3,
    blurradius: 3,
    blurdelta: 20,
    strokewidth: 0,
    linefilter: false,
    roundcoords: 1,
    pal: [{r: 0, g: 0, b: 100, a: 255}, {r: 255, g: 255, b: 255, a: 255}]
}

export const optionCurvy: Options = {
    ltres: 0.01,
    linefilter: true,
    rightangleenhance: false
}

export const optionSharp: Options = {
    qtres: 0.01,
    linefilter: false
}

export const optionDetailed: Options = {
    pathomit: 0,
    roundcoords: 2,
    ltres: 0.5,
    qtres: 0.5,
    numberofcolors: 64
}

export const optionSmoothed: Options = {
    blurradius: 5,
    blurdelta: 64
}

export const optionGrayscale: Options = {
    colorsampling: 0,
    colorquantcycles: 1,
    numberofcolors: 7
}

export const optionFixedPalette: Options = {
    colorsampling: 0,
    colorquantcycles: 1,
    numberofcolors: 27
}

export const optionRandomSampling1: Options = {
    colorsampling: 1,
    numberofcolors: 8
}

export const optionRandomSampling2: Options = {
    colorsampling: 1,
    numberofcolors: 64
}

export const optionArtistic1: Options = {
    colorsampling: 0,
    colorquantcycles: 1,
    pathomit: 0,
    blurradius: 5,
    blurdelta: 64,
    ltres: 0.01,
    linefilter: true,
    numberofcolors: 16,
    strokewidth: 2
}

export const optionArtistic2: Options = {
    qtres: 0.01,
    colorsampling: 0,
    colorquantcycles: 1,
    numberofcolors: 4,
    strokewidth: 0
}

export const optionArtistic3: Options = {
    qtres: 10,
    ltres: 10,
    numberofcolors: 8
}

export const optionArtistic4: Options = {
    qtres: 10,
    ltres: 10,
    numberofcolors: 64,
    blurradius: 5,
    blurdelta: 256,
    strokewidth: 2
}

export const optionPresets = {
    default: optionDefault,
    posterized1: optionPosterized1,
    posterized2: optionPosterized2,
    posterized3: optionPosterized3,
    curvy: optionCurvy,
    sharp: optionSharp,
    detailed: optionDetailed,
    smoothed: optionSmoothed,
    grayscale: optionGrayscale,
    fixedPalette: optionFixedPalette,
    randomSampling1: optionRandomSampling1,
    randomSampling2: optionRandomSampling2,
    artistic1: optionArtistic1,
    artistic2: optionArtistic2,
    artistic3: optionArtistic3,
    artistic4: optionArtistic4,
}