import {from} from "../src/Utils";
import {writeFileSync} from "fs";

const fps = 60
const durationSecs = 30
const totalFrames = fps * durationSecs
const addition = 1
const width = 500
const height = 500
const squareSide = 5

let currentPos = 0

export default function () {
    from(0).to(totalFrames).forEach(frame => {

        if (currentPos === (width - squareSide)) currentPos = 0

        const svg =
            `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
            `<rect fill="#efefef" width="${width}" height="${height}"/>` +
            `<rect height="${squareSide}" width="${squareSide}" y="${currentPos}" x="${currentPos}" fill="#880E4F"/></svg>`

        writeFileSync(`./out/test/${frame}.svg`, svg)

        currentPos += addition
    })
}