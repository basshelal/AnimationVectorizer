export function createVSGV() {
    // loop over all the SVGs in the directory
    // figure out the FrameSets by using some kind of threshold of diff
    //  this can be done by comparing the paths in each adjacent SVG
    // we can technically undo some minor changes between frames but this is technically lossy??
    //  but only if it is under some threshold or something
    // OR we can do FrameSet detection BEFORE vectorization?? This would use pixel data rather than SVG data
    //  but we may do a second iteration after vectorization
}