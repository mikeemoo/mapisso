# mapisso

## Getting started
* `yarn install`
* `yarn start`
* Navigate to `http://localhost:9000/`

## How it works

* Loads data from an Overpass API. It loads `nodes`, `ways` and `relations` within a bounding box, along with any data that is required to use each of those, even if they're outside of the bounding box.
A way is a collection of nodes. A relation is a collection of ways and nodes. So, if it loads part of the coastline, it'll actually load the entire coast line becuase it's loading all of the associated data.
At the moment there's no filters on the data it loads - it'll load *everything* and all of the filtering is done via code. We can eventually drastically reduce the amount of data loaded by filtering out things we don't care about.
* It then loops through the elements and passes them into different handlers. Once it's finished looping through everything, it can call a 'post' handler on each one, allowing them to do some post processing.
* Handlers add collections of Vector arrays to a big quadtree (`Array<Array<Vector>>`). These represent lines that will be drawn on the final image.
* Finally it's passed to outputters - currently `canvas` for the preview and `hpgl` for the plotter code.
* Plotters draw lines! Nothing more. Any shape must be made using lines.

## Questions to answer

* Is there a more efficient way of doing this? Currently storing objects which look like like: `Array< Array< Vector > >`, so an object in the QuadTree is a collection of lines to be drawn. Is this the right thing to store? Would it be better to store polygons instead (even for single lines) and allow the hpgl renderer deal with converting them to individual lines? or the other extreme and store individual line segments?
* Would this be a lot faster in a different language? Probably - but we'd lose access to a few things that are currently handy, like the three.js/jtst libraries, and also the ability to use leaflet.js to select an area on the map. Can we work around this? Are the benefits worth it?

## Outstanding tasks

* Better detail-related controls. Sometimes you want small roads, sometimes you don't. Its not neccessarily related to the zoom level you're at.. You could be zoomed out, but want to show more detail (especially in more rural areas).
* Coast lines are hurting my head. I can plot the coastlines, but it'd be good to show some wave-like lines in the sea. I believe the data we get is currently the 'outline' of the coast, and not complete polygons - it's also broken up into multiple ways which aren't neccessarily joined up. Needs a lot more investigation.
* I haven't done anything regarding terrain yet. There's a few things that come out of the overpass data ('peaks', 'hills'). However, we can also get 'full' elevation data via mapbox.com which could be interesting.
* Introduce the concept of 'styles'. This ia all very 'lord of the rings' based at the moment, but it could be interesting to have the system support multiple styles of maps.
* Need to delete 'streams' that intersect with 'rivers'. Streams are a single line, rivers/lakes are a polygon. Sometimes they are represented as both a stream and river at the same time, and sometimes small streams run into the middle of rivers and it looks weird. Roundhay park is a good illustration of where it goes a bit wrong.
* There's some real weirdness with 'multipolygon' relations. I thought there was only a single 'outer' part with multiple 'inner' parts (islands.etc.), but it seems as though some outer parts are individual line segments, and you have to somehow combine them into a full polygon?? See Scullions lake, south east of york in Heslington

## Resources

* https://wiki.openstreetmap.org/wiki/Map_features - Shows most of the possible map features
* https://docs.mapbox.com/data/tilesets/guides/access-elevation-data/ - Potential source of elevation data
* https://www.openstreetmap.org - Create an account and it'll let you 'edit' the map, which allows you to inspect nodes/ways and find their tags
* https://github.com/bjornharrtell/jsts and https://locationtech.github.io/jts/ - Geometry library. We use the 'buffer' operation in the label renderer to shrink a polygon bit-by-bit to fill with lines
* https://threejs.org/ - we're using this to load the 'aniron' font via a josn file. It converts also converts all of the curves in the font to individual lines
* https://overpass-turbo.eu/ - Little playground thing for experimenting with Overpass API queries

## Potentially interesting libraries

* https://github.com/w8r/GreinerHormann - potentially interesting library for adding and subtracting polygons
* https://www.npmjs.com/package/polygon - some nice polygon related methods. intersections.etc.
* https://www.npmjs.com/package/jsts - geometry library, ported from JTS.
* https://www.npmjs.com/package/three - has a bunch of classes that are relevant. some shape/poly stuff, font loading, vector classes.etc.

## Algorithms

#### `offsetLine` - this offsets a line by a distance.

![image](https://i.imgur.com/Yop53K9.png)

* Find the tangent of each point (cyan points). You can do this by swapping the X and Y, then making the Y negative.
* Cast rays (yellow lines) between these new points and find the intersection points of the rays (green points)

#### `thicken` - this uses offset multiple times to thicken a line to a desired thickness (based on pen width)

#### `pointsEvery` - this breaks a multi-point line into smaller parts, specified by the `distance` parameter. It returns the new points, along with a vector representing the direction of the point as a vector

#### `split` - Basically the above, but returns it as a line, ignoring the direction - and ensures the start and end point are correct

#### `intersection` - finds the intersection point of two line segments (i.e. lines with a start and end point)

#### `hacture` - Fills an array of polygons with horizontal lines. You can specify a gap.

* It creates a list of individual line segments from all of the polygons
* It sorts them based on their minimum position along the X axis
* It scans from the top of the bounding box until the bottom, and any time a scan ray intersects with a line segment, it switches from 'drawing' to 'not drawing' (it starts or ends a new line).

#### `pointFinder` - Given an array of polygons, it'll return a function that'll give you a random coordinate within any of the polygons.

* It weights the polygons based on their total area, then weighted-random selects one of the polygons to look for a point in.
* It then generates a coordinate within the bounds of that polygon and checks to see if the point is within the polygon. It keeps trying until it finds one.

#### `fill` - It inremenetally shrinks the size of a list of polygons by the `lineWidth` until it cant shrink anymore, returning the new list of shrunken polygons. This is used for filling in the text labels.
