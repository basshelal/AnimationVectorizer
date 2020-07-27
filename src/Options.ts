import {Palette} from "./ImageTracer";

export type Options = {
    corsEnabled?: boolean,
    lineThreshold?: number,
    qSplineThreshold?: number,
    pathomit?: number,
    enhanceRightAngles?: boolean,

    // Color quantization
    colorSampling?: number,
    colorsNumber?: number,
    mincolorratio?: number,
    colorquantcycles?: number,

    // Layering method
    layering?: number,

    // SVG rendering
    strokeWidth?: number,
    lineFilter?: boolean,
    scale?: number,
    roundcoords?: number,
    viewbox?: boolean,
    desc?: boolean,
    lcpr?: number,
    qcpr?: number,

    // Blur
    blurRadius?: number,
    blurDelta?: number

    palette?: Palette
    layercontainerid?: string
}

export const optionDefault: Options = {
    corsEnabled: false,
    lineThreshold: 1,
    qSplineThreshold: 1,
    pathomit: 8,
    enhanceRightAngles: true,
    colorSampling: 2,
    colorsNumber: 16,
    mincolorratio: 0,
    colorquantcycles: 3,
    layering: 0,
    strokeWidth: 1,
    lineFilter: false,
    scale: 1,
    roundcoords: 1,
    viewbox: false,
    desc: false,
    lcpr: 0,
    qcpr: 0,
    blurRadius: 0,
    blurDelta: 20
}

export const optionPosterized1: Options = {
    colorsNumber: 4,
    blurRadius: 5
}

export const optionPosterized2: Options = {
    colorsNumber: 4,
    blurRadius: 5
}

export const optionPosterized3: Options = {
    lineThreshold: 1,
    qSplineThreshold: 1,
    pathomit: 20,
    enhanceRightAngles: true,
    colorSampling: 0,
    colorsNumber: 3,
    mincolorratio: 0,
    colorquantcycles: 3,
    blurRadius: 3,
    blurDelta: 20,
    strokeWidth: 0,
    lineFilter: false,
    roundcoords: 1,
    palette: [{r: 0, g: 0, b: 100, a: 255}, {r: 255, g: 255, b: 255, a: 255}]
}

export const optionCurvy: Options = {
    lineThreshold: 0.01,
    lineFilter: true,
    enhanceRightAngles: false
}

export const optionSharp: Options = {
    qSplineThreshold: 0.01,
    lineFilter: false
}

export const optionDetailed: Options = {
    pathomit: 0,
    roundcoords: 2,
    lineThreshold: 0.5,
    qSplineThreshold: 0.5,
    colorsNumber: 64
}

export const optionSmoothed: Options = {
    blurRadius: 5,
    blurDelta: 64
}

export const optionGrayscale: Options = {
    colorSampling: 0,
    colorquantcycles: 1,
    colorsNumber: 7
}

export const optionFixedPalette: Options = {
    colorSampling: 0,
    colorquantcycles: 1,
    colorsNumber: 27
}

export const optionRandomSampling1: Options = {
    colorSampling: 1,
    colorsNumber: 8
}

export const optionRandomSampling2: Options = {
    colorSampling: 1,
    colorsNumber: 64
}

export const optionArtistic1: Options = {
    colorSampling: 0,
    colorquantcycles: 1,
    pathomit: 0,
    blurRadius: 5,
    blurDelta: 64,
    lineThreshold: 0.01,
    lineFilter: true,
    colorsNumber: 16,
    strokeWidth: 2
}

export const optionArtistic2: Options = {
    qSplineThreshold: 0.01,
    colorSampling: 0,
    colorquantcycles: 1,
    colorsNumber: 4,
    strokeWidth: 0
}

export const optionArtistic3: Options = {
    qSplineThreshold: 10,
    lineThreshold: 10,
    colorsNumber: 8
}

export const optionArtistic4: Options = {
    qSplineThreshold: 10,
    lineThreshold: 10,
    colorsNumber: 64,
    blurRadius: 5,
    blurDelta: 256,
    strokeWidth: 2
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