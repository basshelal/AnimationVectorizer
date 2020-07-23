import * as electron from "electron";

export function logD(message: any, calledFrom: string = "") {
    if (!electron.app.isPackaged)
        console.log(
            `${message.toString()}
    ${calledFrom}`)
}

export function logE(message: any, calledFrom: string = "") {
    if (!electron.app.isPackaged)
        console.error(
            `${message.toString()}
    ${calledFrom}`)
}

export function assert(condition: boolean, message: string) {
    if (!electron.app.isPackaged)
        console.assert(condition, message)
}