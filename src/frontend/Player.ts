import {from} from "../Utils";

export default function Player() {
    document.addEventListener("DOMContentLoaded", () => {

        const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement

        const context2D: CanvasRenderingContext2D = canvas.getContext("2d")!!

        const img = new Image()
        img.onload = () => context2D.drawImage(img, 0, 0)

        let idx = 1

        setInterval(() => {
            img.src = `../../out/frames/${idx}.png`
            if (idx !== 527) idx++; else idx = 1
        }, 42)


        from(0).to(100).forEach(i => {
        })
    })
}

Player()