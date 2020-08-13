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

* 13-August-20: We need better color quantization and better edge detection afterwards because some edges of the image 
are actually multiple pixels wide, so instead of using a grid of 4 (2x2) we should look into larger grids like 9 (3x3) 
or 16 (4x4) with the most basic unit (corresponding to a pixel before) being larger, hence we've created a threshold 
on what is the lowest width needed to be considered an edge. This is because cartoons don't really have thin edges, but 
I see this potentially failing with really low or really high resolution cartoon frames, so be careful.

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

* Look into using hardware acceleration ie GPU based execution, the speedups may be marginal for the effort but, 
it's a super cool thing to explore and write about on the report. This is much harder than it should be, leave it 
for much later if we have any time to play around with it.

### Region Detection

How do we differentiate between fills (single color areas or polygons) and gradients (function based shifting color 
polygons)??

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

## Concurrency

Vectorization is a relatively expensive operation, and we need to vectorize hundreds and thousands of frames. It is 
also important to note that vectorization of a frame should for the most part not depend on any other frame, meaning 
vectorization is a highly parallelizable computation workload.

Node has some excellent utilities we can use to help make the most of our hardware cores while running our 
vectorization in a highly concurrent manner. These are:

* [Child Process](https://nodejs.org/api/child_process.html)
* [Cluster](https://nodejs.org/api/cluster.html)
* [Worker Threads](https://nodejs.org/api/worker_threads.html)

Even if we did need a context before a vectorization operation on a frame, the actual vectorization operation 
itself can still be done fairly independently per frame. So even if we need some smart context detection such as 
when detecting FrameSets or Scenes, we can always run a serial first pass (just like how the ffmpeg frame extraction 
is serial) to gather the necessary information and then smartly save the intermediate data which can then be used 
by the threads to perform their workload.

This is all important because vectorization of a video will often be slower than realtime. ie a 22 minute Teen Titans 
Go clip at 30fps will produce 39,600 total frames! At 1280x720 I have witnessed vectorization of a frame take a couple 
of seconds meaning approximately 2 seconds PER FRAME vectorization. Vectorization of the initial 20 second clip took 
around 4 minutes with 520 frames even on a modern 6 Core 12 Thread CPU using a single child process per frame and 
destroying the CPU to 100%. This is a computationally expensive task! Even if we optimize severely, we will almost 
always be slower than realtime and if done poorly then sometimes by orders of magnitude!

So it is absolutely important we optimize this, not so much for the report or results, but for the overall time 
and sanity on our end.


### Notes

1. Extracting frames of a video is most likely a serial only operation but we can attempt to parallelize it by
spinning up new ffmpeg processes each with a specific segment of the video, how we correctly do that though is still
unknown, and it is highly likely this will not yield any substantial results given ffmpeg's apparent use of all CPU
resources

2. It is highly likely we may need a serial "first pass" of all the frames before  any serious vectorization in order
to gain more information and a context before vectorizing, this is because of our desire to use Scenes and FrameSets
to reduce both space and possibly even computational time only at the cost of a single serial smart"first pass".
Still not exactly sure what kind of information we will gather here yet. If this first pass successfully gives us
markers about which frames constitute a FrameSet or Scene (still unsure what to call them yet), we can then
efficiently allocate threads that will work on vectorization of those Scenes since that is a highly serial task most
likely as each frame will need to be aware of the previous frame.

3. The actual vectorization of a frame is itself not very parallelizable, even though we can and will vectorize
multiple frames or scenes in parallel, the operation of vectorizing a frame is still essentially serial and there is
very little we can and even should change about that because it's lost effort.

4. We could have a few more (likely serial) operations done such as the following:
    * Merging SVGs into one file, this is useful because an SVG renderer will only need to open one ReadStream,
      and the final file will be more portable than a directory, we can also easily and quickly gauge the size and other
      file properties
    * Further compression, we can perform even further compression especially with regard to reducing the SVG source
      text amount. Consider the text "rgba(255,255,255)" which uses 17 characters in total. If that text is repeated 
      many times across an entire video we can simply alias it using something smaller like "$1" which the renderer
      will then be able to know that it refers to a constant defined at the top of the file. Reducing 17 characters
      to 2 or 3 can have possibly severe downsizes when done enough times. This is still lossless compression and should
      cost no extra CPU cycles if done correctly. Traditional compression may be out of the question now though, 
      because we need the source to be readable by at least some traditional kind of SVG loader or renderer.

## Renderer

We can and most likely should just use hacks and workarounds with traditional existing SVG renderers such as those 
found in Chromium. Any magic stuff that we may need to do to make video playback work can either be done on separate
threads of execution which will have to be further ahead than the playback cursor, or just as likely be done before 
initial playback of the video. The general idea being we don't want to reimplement SVG drawing on a low level GL level, 
it makes much sense to work around what already exists and add our own tweaks and cleanups. The SVG renderer should 
not be able to tell any difference other than it's loading and drawing a lot of SVGs very quickly obviously.

We need to explore something for the report and that is the usability a technology like this for streaming services. 
If Cartoon Network came up with a streaming service how could a technology like this be used to benefit them and 
how far can we go and what kind of results could we see? I'm thinking like store the video in SVG format, load and 
render it on the servers and only stream back some kind of dumbed down smaller version that will depend on the hardware 
used to view the stream. Essentially then, the viewer gets none of the benefits (or quirks) of the SVG video format, 
but the service provider can save on storage at the tiny cost of rendering SVGs on their own machine (likely they 
have strong infrastructure anyway), but users hopefully would see _significantly_ lower data usage to stream high 
quality content optimized for their viewing device without any additional cost. It's optimistic and it's mostly 
on the service provider's side in terms of gains, but this could save a lot of money for up and coming services which 
would prefer to spend on maintainable and predictable servers rather than hard drives and database redundancy schemes
etc. Essentially then, it's game streaming without the user providing an input, so the user will not need any CPU power 
other than to just playback the content.

## Report

