import * as electron from "electron";
import {BrowserWindow} from "electron";
import url from "url";
import path from "path";
import installExtension, {REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS} from "electron-devtools-installer";

let browserWindow: BrowserWindow

electron.app.allowRendererProcessReuse = true
electron.app.whenReady().then(onReady)

async function onReady() {
    browserWindow = new BrowserWindow({
        backgroundColor: "#0e0e0e",
        width: 1280,
        height: 720,
        autoHideMenuBar: false,
        webPreferences: {
            nodeIntegration: true
        }
    })

    if (process.env.NODE_ENV === 'development') {
        installExtension(REACT_DEVELOPER_TOOLS)
            .then((name) => console.log(`Added Extension:  ${name}`))
            .catch((err) => console.log('An error occurred: ', err));
        installExtension(REDUX_DEVTOOLS)
            .then((name) => console.log(`Added Extension:  ${name}`))
            .catch((err) => console.log('An error occurred: ', err));
    }

    if (process.env.NODE_ENV === 'development') {
        browserWindow.loadURL('http://localhost:4000')
    } else {
        browserWindow.loadURL(
            url.format({
                pathname: path.join(__dirname, 'renderer/index.html'),
                protocol: 'file:',
                slashes: true
            })
        )
    }
}