
## SVG Video Format Spec

```SVG
<video durationMs="69420" frameRate="23" totalFrames="1596660">
    <frameset frameCount="2">
        <rootframe time="0">
            <!--Typical SVG code describing the entire frame-->
        </rootframe>
    
        <frame time="43">
            <!--Describe only the different between this and the previous frame-->
        </frame>
    
        <!--More frames...-->
    
    </frameset>
</video>
```

How do we handle the differences between frames ourselves :/
To ensure correct syncing if frames are lost or taking too long, each frame can have a time property.
If we do actually have an audio track playing and if a frame is lost or synchronization is lost we have a way 
of syncing them back again