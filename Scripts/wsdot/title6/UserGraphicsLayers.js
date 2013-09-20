/*global define*/
	
define(["esri/graphic",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol"
], function (Graphic, GraphicsLayer, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol) {
	"use strict";
	/** Collection of layers of user added graphics.
	 */
	function UserGraphicsLayers(/** {esri/Map} */ map) {
		var pointRenderer, lineRenderer, polygonRenderer, pointSymbol, lineSymbol, polygonSymbol;
		// Create graphics layers

		this.points = new GraphicsLayer({ id: "userPoints" });
		this.lines = new GraphicsLayer({ id: "userLines" });
		this.polygons = new GraphicsLayer({ id: "userPolygons" });

		// Add renderers.
		pointSymbol = new SimpleMarkerSymbol();
		lineSymbol = new SimpleLineSymbol();
		lineSymbol.setColor("#000000");
		polygonSymbol = new SimpleFillSymbol();
		polygonSymbol.setOutline(lineSymbol);

		pointRenderer = new SimpleRenderer(pointSymbol);
		lineRenderer = new SimpleRenderer(lineSymbol);
		polygonRenderer = new SimpleRenderer(polygonSymbol);

		this.points.setRenderer(pointRenderer);
		this.lines.setRenderer(lineRenderer);
		this.polygons.setRenderer(polygonRenderer);


		// Add layers to the map
		map.addLayers([this.points, this.lines, this.polygons]);

	}

	/** Clears graphics from all of the layers.
	 */
	UserGraphicsLayers.prototype.clear = function () {
		this.points.clear();
		this.lines.clear();
		this.polygons.clear();
	};

	/** Adds a graphic to one of the graphics layers, determined by they geometry type of the graphic.
	 * @returns {esri/Graphic}
	 */
	UserGraphicsLayers.prototype.add = function (/** {esri/Graphic} */ graphic) {
		var output, layer;

		// Is this a geometry and not a graphic? Create a graphic.
		if (graphic.type) {
			graphic = new Graphic(graphic);
		}

		// Clear the existing graphics.
		this.clear();
		if (graphic && graphic.geometry) {
			// Determine which layer will have a graphic added to it.
			layer = /(?:multi)?point/i.test(graphic.geometry.type) ? this.points
				: graphic.geometry.type === "polyline" ? this.lines
				: this.polygons;
			// Add the graphic.
			output = layer.add(graphic);
		}
		return output;
	};

	return UserGraphicsLayers;
});