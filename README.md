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

* Is there a more efficient way of doing this? Instead of storing these big `Array<Array<Vector>>` objects in the quad tree, would it be better to store individual line segments (`{p1: Vector, p2: Vector}`) and add ways to retrieve the 'group' that they're part of? Or should we only store polygons (even for roads), then we convert those polygons into lines inside the hpgl output?
* Would this be a lot faster in a different language? Probably - but we'd lose access to a few things that are currently handy, like the three.js/jtst libraries, and also the ability to use leaflet.js to select an area on the map. Can we work around this? Are the benefits worth it?

## Outstanding tasks

* Better detail-related controls. Sometimes you want small roads, sometimes you don't. Its not neccessarily related to the zoom level you're at.. You could be zoomed out, but want to show more detail (especially in more rural areas).
* Coast lines are hurting my head. I can plot the coastlines, but it'd be good to show some wave-like lines in the sea. I believe the data we get is currently the 'outline' of the coast, and not complete polygons - it's also broken up into multiple ways which aren't neccessarily joined up. Needs a lot more investigation.
* I haven't done anything regarding terrain yet. There's a few things that come out of the overpass data ('peaks', 'hills'). However, we can also get 'full' elevation data via mapbox.com which could be interesting.
  * https://wiki.openstreetmap.org/wiki/Map_features
  * https://docs.mapbox.com/data/tilesets/guides/access-elevation-data/
* Introduce the concept of 'styles'. This ia all very 'lord of the rings' based at the moment, but it could be interesting to have the system support multiple styles of maps.
