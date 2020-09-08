# Dissertation Draft

## Abstract

## Introduction

## Background

In this section we need to explain to the reader how most current graphics data is represented, ie raster graphics
in a high level way and explain the advantages and disadvantages of this approach. Then, begin explaining the 
alternative, declarative approach Vector Graphics again in a high level way and how it compares to raster graphics, 
advantages and disadvantages etc. Then get into compression, Gary wants us to get deep on this, depends on how 
much we focus on the compression aspect of it, I think we should because it's interesting and complicated but it *is* 
complicated. The compression aspect we can explain image and video compression on a somewhat high level. At the end 
we can tie it all to videos and how basically anything that applies to images will 99% apply to video as well, hence 
we treat them the same. Remember that the reader may not be familiar with any graphics (or even programming) stuff, 
so it's important to keep things high level and unassuming of knowledge level.

Amount of streaming data from Netflix or some shit to emphasize that video is very popular but also very very large.

YouTube compression is another indication

### Raster Graphics

Bitmaps, Image Data Buffers, Pixels, Resolution, Upscaling and pixelation

### Vector Graphics

SVG, Geometry, Renderers, Logos, Adobe Illustrator, Size, Scalability

### Image Compression

Lossy, lossless, JPEG, PNG

### Video Graphics

Mostly same as Images except moving and include Audio, we are ignoring Audio.

### Document Specifics?

Stuff we will use and reference throughout this document?
So with any math we will also have accompanying TS-like pseudocode for the more programming oriented 
reader such as myself

## Related Work

A section where we talk about ML and how, it may be useful in this instance, it is not a viable true 
solution because ML is absolute trash, it is not fun, it requires datasets, results depend on previous learnings
and of course we have no idea how it's calculating anything and thus cannot change the function ourselves. We are thus 
throwing away the problem to the machine and telling it to solve it for itself and we have no idea or control what is 
happening. Reference cases where ML fails and ML's major drawbacks as a viable solution to a problem because of these 
issues. We need to mention somewhere the elephant in the room that is machine learning and why we did not take that 
approach because of its huge disadvantages because honestly like fuck machine learning. However, in reality the 
disadvantages are actually too many for something like this because art like cartoons comes in different forms and
styles and no machine learning algorithm can do this well enough for all use cases.

## Implementation

### Pipeline

The basic high level pipeline demonstrating the input, the processing, and the output

We can later add a few more pipeline images representing the different approaches we took from a high level

### Toolchain

Node, TypeScript, Electron, React?
OpenCV, GPU.js

No need to spend too much time on this part, just quickly mention the tools that we use and why we chose them. 
This makes the reader brace themselves for what we did without actually telling them just yet.

### Approaches

#### Color Quantization Based Approach

A color quantization based approach using an existing high quality library made for web (ImageTracer.js)

Very accurate and efficient, well documented, using a sound approach but
too dependent on quantization number of colors, too high will make huge file sizes, take way long and at some 
point has diminishing returns, this number is also human inputted and cannot be easily chosen based on the image

#### Edge Detection Based Approach

An edge detection based approach using OpenCV that will then attempt to make paths and polygons from the edges

Sound in theory but not all paths will create polygons and all it takes is a single pixel to connect 2 polygons that
are otherwise unrelated or a single pixel gap to disconnect a polygon

#### Connected Component Labelling Based Approach

A connected component labelling based approach that reduces an image into connected "Color Regions" such that 
an image with n color regions has at most n unique colors, each pixel in a color region has the same color

Much slower and fails somewhat at the edges because pixels are in between to color regions, thus > 95% of all regions 
are less than 5 pixels large, reduction has yet shown no positive results

### Limitations & Drawbacks

Mostly speed, this process is very expensive and needs to be heavily optimized but even then, 
it will be difficult to make fast, I personally expect like at best with maximum optimizations
and for highest accuracy something along the line of minutes for a frame on my machine, obviously more 
powerful CPUs and GPUs will be faster but it's still not going to be realtime anytime soon

The vectorization process is by its nature lossy, it is transforming the data that is made for rasterization with all of
the requirements, optimizations and issues of that medium, such as Anti-Aliasing into data that is optimal for vector
graphics which has discrete colors and uses geometric shapes instead of pixels. In many ways, we can say we are undoing
the effects of rasterization that the studio applied upon video export from their vector graphics application. The
rasterization process itself was lossy (more accurately transformative) and thus undoing it will also be
transformative of the transformation. This may be an issue because there are cases where visible data is lost, 
whether it be noise or actual data, especially in the case of gradients where SVGs especially suffer, at least in the
vectorization process but also with non-uniform gradients which become significantly more complex and thus 
more difficult to compute and more expensive to store.

## Software Engineering

### Methodology

Extreme Lean Agile because life is unknown beyond 2 days in these strange times we live in

### Schedule (Gantt Chart)

Followed it well but started falling apart towards the end, very accurate to the real world :D

### Risks

## Evaluation

Two main angles, accuracy to the original and compression rate from the original

### Accuracy

Accuracy means how close we are to the original image, this may or may not be affected by artifacts and noise 
so we need to do a human approach as well as a quantitative direct comparison

For quantitative compare each pixel on the original to the color on the SVG, this will unfortunately be 
affected by artifacts and noise so we should make that clear

For qualitative a simple eye check side by side will do, we can also do an upscaling comparison. So show an upscaled 
video or image of the original vs our own, this way we can say that we have successfully defeated upscaling by just 
using vectorization because both are indistinguishable yet our own is more portable and scalable so the other
advantages carry it. We can also do a fixed size comparison, meaning if both files are x size show both and ask which 
is better, we can then create a metric that is like quality per MB or some shit like that so that we can prove that 
in the higher end we always have better quality per MB because SVG is built to be scalable and portable whereas 
rasterization shines on smaller displays and fixed sizes.

### Compression

For quantitative a size comparison (duh)
For size comparisons we need to try a ton of configurations with the originals to help prove our point, 
for example if we upscale the frames/videos to 4K and "upscale" ours to the same and compare size, or 
if we use uncompressed image and video formats vs our own. We could also use some of techniques to heavily reduce
the size of our output, even if it is unusable by most applications. It's not exactly apples to apples but it will 
further exaggerate our points and make our negatives not bad in comparison, but we still won't lie though, 
just be selective in our favor.
For qualitative we can actually do a file transfer speed comparison to prove that a smaller size is visible

## Results and Findings

GPU acceleration is hard but improves speed shockingly well

Node sucks for concurrency and doesn't have true multi-threading

## Challenges

JavaScript is really flexible but also really not yet mature for good OOP scalable development, TS helps but things 
are not as mature as the JVM for example.

GPU programming is insanely difficult and yields huge benefits

Optimizations to increase speed are also difficult and especially so on a non-multi-threaded environment like Node

Reducing the number of human inputted arguments to create a fully autonomous system that is not ML based and produces 
very accurate results is very very difficult

Naysayers will always just say use ML and the temptation to use ML for highest results for a project like this is large 
but at the same time ML is absolute trash as discussed earlier

## Reflection

This was a difficult project but has allowed me to get deeper into some topics I never thought I would get into like 
Graphics, Images, GPU and get more comfortable and familiar with tools like TS/JS and others.

Time Management is also a bitch and being constantly given poor results after multiple different attempts is very 
frustrating but also humbling, overall I've learned to better cope and deal with things not working so it's been 
a very valuable and rewarding experience overall

## Future Work

Use better tools that allow for native multi-threading, faster execution and easier and direct access to GPU like JVM
or Native if I'm mentally psychotic, this is quite doable because there actually isn't that much code really. This 
is really just for better performance and optimizations because as discussed Node has it's limitations.

## Conclusion

## Summary