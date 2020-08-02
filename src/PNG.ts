import {readFileSync, writeFileSync} from "fs";
import {ImageData} from "./ImageTracer/Types";

const lib = require("pngjs").PNG

export type PNGImageData = {
    width: number,
    height: number,
    data: Buffer,
    depth?: number,
    interlace?: boolean,
    palette?: boolean,
    color?: boolean,
    alpha?: boolean,
    bpp?: number,
    colorType?: number,
    gamma?: number
}

export async function readPNG(path: string): Promise<PNGImageData> {
    return new Promise((resolve, reject) => {
        try {
            resolve(lib.sync.read(readFileSync(path)))
        } catch (e) {
            reject(e)
        }
    })
}

export async function writePNG(path: string, pngImageData: PNGImageData): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            resolve(writeFileSync(path, lib.sync.write(pngImageData)))
        } catch (e) {
            reject(e)
        }
    })
}

export async function writeImage(path: string, imageData: ImageData): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            resolve(writeFileSync(path, lib.sync.write(imageData)))
        } catch (e) {
            reject(e)
        }
    })
}

export function PNGImageDataToImageData(pngImageData: PNGImageData): ImageData {
    return new ImageData({width: pngImageData.width, height: pngImageData.height, data: pngImageData.data})
}