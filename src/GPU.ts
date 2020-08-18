import {GPU, IKernelRunShortcut, KernelFunction} from "gpu.js";

const gpu = new GPU({mode: "headlessgl"})

export function onGPU(func: KernelFunction, output: number[]): IKernelRunShortcut {
    return gpu.createKernel(func).setOutput(output)
}