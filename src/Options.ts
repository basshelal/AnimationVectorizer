export type Options = {
    lineThreshold?: number,
    qSplineThreshold?: number,
    pathomit?: number,

    // Color quantization
    colorsNumber?: number,
    mincolorratio?: number,
    colorquantcycles?: number,

    // Layering method
    layering?: number,

    // SVG rendering
    strokeWidth?: number,
    lineFilter?: boolean,
    scale?: number, // TODO delete this we don't need it!
    roundcoords?: number,
    lcpr?: number,
    qcpr?: number,

    // Blur
    blurRadius?: number,
    blurDelta?: number
}

export const optionDefault: Options = {
    lineThreshold: 1,
    qSplineThreshold: 1,
    pathomit: 8,
    colorsNumber: 16,
    mincolorratio: 0,
    colorquantcycles: 3,
    layering: 0,
    strokeWidth: 1,
    lineFilter: false,
    scale: 1,
    roundcoords: 1,
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
    colorsNumber: 3,
    mincolorratio: 0,
    colorquantcycles: 3,
    blurRadius: 3,
    blurDelta: 20,
    strokeWidth: 0,
    lineFilter: false,
    roundcoords: 1,
}

export const optionCurvy: Options = {
    lineThreshold: 0.01,
    lineFilter: true,
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
    colorquantcycles: 1,
    colorsNumber: 7
}

export const optionFixedPalette: Options = {
    colorquantcycles: 1,
    colorsNumber: 27
}

export const optionArtistic1: Options = {
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
    artistic1: optionArtistic1,
    artistic2: optionArtistic2,
    artistic3: optionArtistic3,
    artistic4: optionArtistic4,
}