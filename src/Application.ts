import * as electron from "electron";
import {BrowserWindow} from "electron";

let browserWindow: BrowserWindow

electron.app.allowRendererProcessReuse = true
electron.app.whenReady().then(onReady)

async function onReady() {
    browserWindow = new BrowserWindow({
        center: true,
        width: 1280,
        height: 720,
        autoHideMenuBar: false,
        darkTheme: true,
        webPreferences: {
            javascript: true,
            nodeIntegration: true
        }
    })
    await browserWindow.loadURL("http://localhost:3000/")
}