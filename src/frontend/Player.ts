document.addEventListener("DOMContentLoaded", () => {

    const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement

    const context2D: CanvasRenderingContext2D = canvas.getContext("2d")!!

    const img = new Image()
    img.onload = () => context2D.drawImage(img, 0, 0)

    let idx = 0

    setInterval(() => {
        img.src = `../../out/test/${idx}.svg`
        if (idx !== 1799) idx++; else idx = 0
    }, 17)
})