import {Color, ImageData} from "./ImageTracer/Types";
import {writeImage} from "./PNG";
import {writeFileSync} from "fs";
import {json, now} from "./Utils";
import chalk from "chalk";

export const logOptions = {
    enabled: true
}

export function logD(message: any) {
    if (logOptions.enabled)
        console.debug(`${now()}\n` +
            chalk.blueBright(`${message.toString()}\n`)
        )
}

export function logW(message: any) {
    if (logOptions.enabled)
        console.warn(`${now()}\n` +
            chalk.yellowBright(`${message.toString()}\n`)
        )
}

export function logI(message: any) {
    if (logOptions.enabled)
        console.info(`${now()}\n` +
            chalk.whiteBright(`${message.toString()}\n`)
        )
}

export function logE(message: any, calledFrom: string = "") {
    if (logOptions.enabled)
        console.error(`${now()}\n` +
            chalk.red(`${message.toString()}\n`)
        )
}

export function assert(condition: boolean, message: string) {
    if (logOptions.enabled)
        console.assert(condition, message)
}

export async function writePixels(pixels: Array<Color>, fileName: string) {
    if (logOptions.enabled)
        await writeImage(`./logs/${fileName}.png`, ImageData.fromPixels(pixels))
}

export async function writeLog(data: any, fileName: string) {
    if (logOptions.enabled)
        writeFileSync(`./logs/${fileName}.json`, json(data))
}

export async function writeLogImage(imageData: ImageData, fileName: string) {
    if (logOptions.enabled)
        await writeImage(`./logs/${fileName}.png`, imageData)
}
