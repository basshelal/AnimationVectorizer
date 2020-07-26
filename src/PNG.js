"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const lib = require("pngjs").PNG;
async function readPNG(path) {
    return new Promise((resolve, reject) => {
        try {
            resolve(lib.sync.read(fs_1.readFileSync(path)));
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.readPNG = readPNG;
async function writePNG(path, pngImageData) {
    return new Promise((resolve, reject) => {
        try {
            resolve(fs_1.writeFileSync(path, lib.sync.write(pngImageData)));
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.writePNG = writePNG;
