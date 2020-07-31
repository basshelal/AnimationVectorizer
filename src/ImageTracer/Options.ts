export type Options = {
    lineThreshold: number,
    qSplineThreshold: number,
    pathomit: number,

    // Color quantization
    colorsNumber: number,
    mincolorratio: number,
    colorquantcycles: number,

    // SVG rendering
    lineFilter: boolean,
    scale: number, // TODO delete this we don't need it!
    roundcoords: number,
    lcpr: number,
    qcpr: number,

    // Blur
    blurRadius: number,
    blurDelta: number
}

export const optionDefault: Options = {
    lineThreshold: 1,
    qSplineThreshold: 1,
    pathomit: 8,
    colorsNumber: 16,
    mincolorratio: 0,
    colorquantcycles: 3,
    lineFilter: false,
    scale: 1,
    roundcoords: 1,
    lcpr: 0,
    qcpr: 0,
    blurRadius: 0,
    blurDelta: 20
}

export const optionDetailed: Options = {
    pathomit: 0,
    roundcoords: 2,
    lineThreshold: 0.5,
    qSplineThreshold: 0.5,
    colorsNumber: 64,
    mincolorratio: 0,
    colorquantcycles: 3,
    lineFilter: false,
    scale: 1,
    lcpr: 0,
    qcpr: 0,
    blurRadius: 0,
    blurDelta: 20
}