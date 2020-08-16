# Process Overview

## Current Process

Below is a brief idea of the current process

### Color Quantization

The number of colors to reduce the palette to MUST be provided, this produces varying degrees of accuracy, with low
numbers leading to data loss and high numbers leading to noise. The algorithm itself is also highly dependent on the
number of colors, this also applies to the size of the resulting SVG which will have an SVG `<path>` element for
every color in the palette. This is problematic because this human inputted value has huge implications on the
performance and accuracy of the algorithm. While this may be good for the original library's purpose, a more automated
and deterministic approach is required here.

### Edge Detection

An indexed image is created based on the now known palette, which has now shifted the original colors to their closest 
representative in the palette. As such, edge detection becomes much simpler to perform since an edge is now just the
beginning of a new color area.

### Path Scanning

Based on the edges we detected earlier, we can now scan the paths for each color, essentially creating a polygon that
represents the area(s) of the image where that color is present, even if they are not contiguous.

### Path Optimizations

Some interpolations between the points is done for smoothing and anti aliasing like effects which intend to reduce
the pixel like path movements.

### SVG Drawing

Finally, the SVG is drawn using SVG `<path>` elements only and using their poweful commands such as `M`, `L` etc.
The SVG will have a path for every color, but even for every color if the path is not contiguous it may also have 
multiple paths for every color. These can however be joined fairly easily to make for a maximum path number equal to 
the number of colors in the palette.

## Proposed Improved Process

The above original process is flawed in its foundation as the process is highly dependent on the human provided input, 
that being the number of colors that will be used to create a palette during the first step, Color Quantization. This
is, in addition to the fact that higher numbers do not always lead to better images and will often lead to
significantly longer computational time, and more importantly, larger file sizes. This is a new process must be
explored.

### Edge Detection

Using a form of edge detection such as Canny, we can, in essence look for the paths (edges) within the image to find
out how it will be traced. This will have a few input arguments such as thresholds which will affect the accuracy and 
likely performance and size of the resulting image. Essentially, if more edges are detected, then there is more work to 
do and more data to write. It is of high importance then that the Edge detection is extremely optimal. It is clear
then, that we have changed our most important factor from being number of colors to edges which I believe is a better 
factor to be the key, especially with regard to videos which will have variable palettes between scenes.

### Polygon Detection

Once the edges have been found we need to figure out where they begin and end in order to know which ones have one color
in them. In essence, we have inverted the original process here by depending on the edges to determine the polygons
and paths and not the colors. Ideally, the edge detection algorithm will result in edges that start and end to form a
polygon, but there may exist outliers which are either noise, or more likely missing data which may be solved by
running another edge detection pass using different parameters on the algorithm. Here is where we may run into 
some problems because the edge detection algorithm will not always return pure polygons.

### Color Quantization

Once the polygons have been determined, we must then use a smart quantization or averaging method to finid the best 
representative color for each polygon. Each polygon will theoretically be actually made up of pixels with many colors 
likely those that are close and similar. A basic averaging method should probably work here in most cases. Also, be 
aware that there are no true "edges", an edge is just the infinitely small line that is the divider between two color 
polygons. Thus, in this model, an image can be partitioned into color polygons which are essentially paths that form a 
polygon (so they return to their origin) that have 1 color filled in them, precisely as SVG represents complex images.

### SVG Drawing

SVG drawing is basically identical to the original algorithm with the possible key difference being that we may want 
to investigate a better way of choosing to draw the color polygons in order to make use of our proposed optimizations 
in the VSGV standard. One proposed way is a single SVG path for each color, this is likely not ideal and is a good 
initial working hack or final resort. A better idea is to have the polygons be stacked on top of each other. This is 
useful when it comes to the moving elements of the video, in order to only change some elements of the paths position 
rather than redraw. The order of the SVG matters here as well as how we perceive the theoretical paths of the polygon 
versus the actual drawn paths and colors which may actually be the opposite or too much.
So, for example, if there is a red "background" and a blue circle in the middle, the algorithm would correctly consider 
the "background" to be a polygon that actually looks like a rectangle with a circular hole in the middle, this is
because we use the partition model. However, for efficiency, what we end up doing is creating a full red background
and at the top (successive SVG elements will always stack on top of the previous, ie have a higher z value) have a 
blue circle. In this case, every polygon takes up much more space than it actually shows and only the topmost polygon 
is truly correct and not taking up more space, the trick is in using SVG's z stacking to trick the eyes into forming
a picture. Imagine a drawing made of stacks of paper that form a pyramid, each layer is smaller slightly than the
previous until the last one being at the top and usually the smallest. The only problem with this though is that its 
very complicated and determining the order of the layers could be trickier to compute than it may seem.