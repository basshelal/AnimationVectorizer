# Notes

## TODO

* (Meat & 'taters) Vectorization algorithm! At first use someone else's and improve and fix later

* Define a spec for animated SVGs that is as smart as possible, allowing for the least possible data to be stored
  this would require us to implement our own renderer (yikes!) that conforms to the spec
  
* The renderer need not be made from scratch really, we can get something quick and dirty going by
  using any SVG viewer on the frontend that will be told to change to the next SVG depending on the defined framerate.
  We'd need to implement some kind of buffer or lookahead though because SVG rendering is CPU based and thus, slow
  machines or large images will be seen "drawing" which is undesired behavior.
  
* Compress the SVG file as much as possible by using simple things like minification but maybe later using
  actual compression algorithms like MPEG, PNG and shit that will actually alter the source data or something.
  Not a huge fan of this though because it does change the actual source of the SVG but lossless compression options
  can be explored and used.

## Ideas

* Find some test clips from cartoons, I think a nice mix of time period and art styles would be nice
    * Teen Titans Go! (Modern & simplistic, computerized style)
    * Fairly Odd Parents (Beloved and looks very easy while still being old)
    * Regular Show (Modern but classic hand drawn style)
    * Johnny Bravo (Classic CN, older and in low quality and aspect ratio)
    * Ed Edd n Eddy (Same as Johnny Bravo but also with a unique difficult art style with lots of flickering)
    * Amazing World of Gumball (Various art styles could be challenging, including 3D models)
    * Tom & Jerry (ancient, this is the best use case for our application but is likely the hardest)
    * Some weeb shit (Weeaboos are too common, Japanese cartoons have a "unique" ugly art style we should try out)

* Figure out a decent way to quantitatively measure results (quality and compression)

### Animated SVG

Since cartoons and most frame based media may have a lot of frames in succession using the same parts, we can take 
a page out of classic MPEG compression and attempt to reduce any redundant data.

A "Scene" is a FrameSet (set or series of frames) that will have a root frame which will contain 100% of its actual
data, this is used as a reference point for later frames. Each successive frame in the Scene will only contain the 
differences between it and the previous frame or root frame, (depending on which one we find most efficient, likely 
the previous frame method). This saves space AND CPU cycles meaning better performance! This can be acheived using a 
simple delta check between consecutive frames to see both what is different and by how much. If a pair of successive 
frames has a difference high enough that meets the threshold then a new Scene is needed, otherwise we just continue 
whatever scene we are currently on.

The only reason we need to implement our own renderer is because of this aspect! How can current SVG viewers render 
scenes in an efficient way? We could technically give each frame of a Scene its missing information during runtime 
in the buffer but that costs CPU cycles and is horribly inefficient only because we haven't implemented our own 
renderer.

Consider true layering to help with frame deltas, as a character moves across a green background, the SVGs difference
between frames will be large because the background object needs to redraw its positions, but if we made the background
act as a true background layer, meaning it takes over a large space and the character is drawn _on top of it_, then when
the character moves the background doesn't actually need to be redrawn and instead only the character changes. Just a 
general idea, not sure how we would implement this.

## Report

