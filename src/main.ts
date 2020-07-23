import {logD} from "./utils";

console.log("Hello World!")

const extractFrames = require('ffmpeg-extract-frames')

async function main() {
    // default behavior is to extract all frames
    await extractFrames({
        input: 'res/PIE.avi',
        output: 'out/frame-%d.png'
    })

    logD("Finished extracting frames")
    // generated screenshots:
    // out/frame-1.png
    // out/frame-2.png
    // ...
    // out/frame-100.png
}

main()