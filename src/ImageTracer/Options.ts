export type Options = {
    lineThreshold: number,
    qSplineThreshold: number,
    pathomit: number,

    // Color quantization
    colorsNumber: number,
    colorquantcycles: number,
    roundToDec: number
}

export const optionDefault: Options = {
    lineThreshold: 1,
    qSplineThreshold: 1,
    pathomit: 8,
    colorsNumber: 64,
    colorquantcycles: 3,
    roundToDec: 0
}

export const optionDetailed: Options = {
    lineThreshold: 0.5,
    qSplineThreshold: 0.5,
    pathomit: 0,
    colorsNumber: 128,
    colorquantcycles: 8,
    roundToDec: 1
}

export const smallestSize: Options = {
    lineThreshold: 1,
    qSplineThreshold: 1,
    pathomit: 16,
    colorsNumber: 16,
    colorquantcycles: 3,
    roundToDec: 0
}