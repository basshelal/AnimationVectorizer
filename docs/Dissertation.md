# Dissertation Draft

## Abstract

## Introduction

Motivation

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

### Raster Graphics

### Vector Graphics

### Image Compression

### Video Graphics

### Document Specifics?

Stuff we will use and reference throughout this document?
So with any math we will also have accompanying TS-like pseudocode for the more programming oriented 
reader such as myself

## Related Work

## Implementation

We need to mention somewhere the elephant in the room that is machine learning and why we did not take that 
approach because of its huge disadvantages because honestly like fuck machine learning. However, in reality the 
disadvantages are actually too many for something like this because art like cartoons comes in different forms and
styles and no machine learning algorithm can do this well enough for all use cases.

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

## Software Engineering

### Methodology

### Schedule (Gantt Chart)

### Risks

## Evaluation

### Evaluation of Accuracy

For quantitative compare each pixel on the original to the color on the SVG
For qualitative a simple eye check side by side will do

### Evaluation of Compression

For quantitative a size comparison (duh)
For qualitative we can actually do a file transfer speed comparison to prove that a smaller size is visible

## Results and Findings

GPU acceleration is hard but improves speed shockingly well

## Challenges

## Reflection

## Conclusion

## Summary