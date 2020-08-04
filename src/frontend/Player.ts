document.addEventListener("DOMContentLoaded", () => {
    const newElement = document.createElement("h1")

    newElement.textContent = "New Element!"

    const svgContainer: HTMLDivElement = document.getElementById("svgContainer") as HTMLDivElement

    svgContainer.textContent = "Changed SVG Container"

    svgContainer.appendChild(newElement)

    console.log("Hello World!")
})