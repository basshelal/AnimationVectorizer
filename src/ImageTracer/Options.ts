export type Options = {
    lineThreshold: number,
    qSplineThreshold: number,
    pathOmit: number,

    // Color quantization
    colorsNumber: number,
    colorQuantCycles: number,
    roundToDec: number
}

export const optionDefault: Options = {
    lineThreshold: 1,
    qSplineThreshold: 1,
    pathOmit: 8,
    colorsNumber: 64,
    colorQuantCycles: 3,
    roundToDec: 0
}

export const optionDetailed: Options = {
    lineThreshold: 0.5,
    qSplineThreshold: 0.5,
    pathOmit: 0,
    colorsNumber: 128,
    colorQuantCycles: 8,
    roundToDec: 1
}

export const smallestSize: Options = {
    lineThreshold: 1,
    qSplineThreshold: 1,
    pathOmit: 16,
    colorsNumber: 16,
    colorQuantCycles: 3,
    roundToDec: 0
}