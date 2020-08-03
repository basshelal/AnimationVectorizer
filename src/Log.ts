import {Color, ImageData} from "./ImageTracer/Types";
import {writeImage} from "./PNG";
import {writeFileSync} from "fs";
import {json, now} from "./Utils";
import * as chalk from "chalk";

export function logD(message: any) {
    console.debug(
        chalk.blueBright(`${now()}\n${message.toString()}\n`)
    )
}

export function logW(message: any) {
    console.warn(
        chalk.yellowBright(`${now()}\n${message.toString()}\n`)
    )
}

export function logI(message: any) {
    console.info(
        chalk.whiteBright(`${now()}\n${message.toString()}\n`)
    )
}

export function logE(message: any, calledFrom: string = "") {
    console.error(
        chalk.red(`${now()}\n${message.toString()}\n`)
    )
}

export function assert(condition: boolean, message: string) {
    console.assert(condition, message)
}

export async function writePixels(pixels: Array<Color>, fileName: string) {
    await writeImage(`./logs/${fileName}.png`, ImageData.fromPixels(pixels))
}

export async function writeLog(data: any, fileName: string) {
    writeFileSync(`./logs/${fileName}.json`, json(data))
}