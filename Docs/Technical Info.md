Technical Info
==============

## General ##

* Code is decorated with [jsdoc] comments. This can be used to automatically generate documentation. The process for generating the documentation is not currently set up for this project, though.

## default.js ##

1. `ready` function is called when all dojo components are ready.
2. `arcgisUtils.createMap` function is called and passed a web map ID.
	* map center and zoom level is loaded from localStorage if available.
3. Graphics layers are created and added to the map.
4. LayerChooser control is created and added to the page. This will show the different layers as defined in the web map. Any layers from the web map containing with a name containing `Aggregate` will not be included in the list of layers on this control.
5. GraphicsLayerList is created and added to the page. This will show any user-added graphics layers. (E.g., imported points from a CSV file.)
6. ChartDataProvider is created using the Aggregate layer from the web map.
7. Event handlers are created for the ChartDataProvider that will update the charts on the page as the user makes selections.
8. Application toolbars are created.

## chartDataProvider.js ##

This defines the ChartDataProvider module / class.

[jsdoc]:http://usejsdoc.org/