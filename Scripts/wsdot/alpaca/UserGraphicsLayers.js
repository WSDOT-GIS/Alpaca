/*global define*/
	
define(["esri/graphic",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/geometry/jsonUtils"
], function (Graphic, GraphicsLayer, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, jsonUtils) {
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
	 * @param {(esri/Graphic|esri/geometry/Geometry|string} graphic Either a graphic, geometry, or JSON string representation of a geometry.
	 * @returns {esri/Graphic}
	 * @throws {TypeError} Throws if graphic parameter is null or falsey.
	 */
	UserGraphicsLayers.prototype.add = function (/** {(esri/Graphic|esri/geometry/Geometry|string} */ graphic) {
		var output, layer;

		if (!graphic) {
			throw new TypeError("Input parameter must be a Graphic, Geometry, or a JSON string representation of a geometry.");
		}

		// Parse a JSON string into geometry.
		if (typeof graphic === "string") {
			graphic = JSON.parse(graphic);
			graphic = jsonUtils.fromJson(graphic);
		}

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

	/** Gets the geometry currently in the graphics layers. 
	 * Since there should only be one graphic stored at a time, there
	 * will only be a single geometry returned.
	 * @returns {string} Returns a JSON string representation of a geometry if there is a graphic, null if there are no graphics.
	 */
	UserGraphicsLayers.prototype.getGeometryForStorage = function () {
		var graphic, geometry;

		if (this.points.graphics.length) {
			graphic = this.points.graphics[0];
		} else if (this.lines.graphics.length) {
			graphic = this.lines.graphics[0];
		} else if (this.polygons.graphics.length) {
			graphic = this.polygons.graphics[0];
		}

		if (graphic && graphic.geometry) {
			geometry = graphic.geometry.toJson();
		}

		return geometry ? JSON.stringify(geometry) : null;
	};

	return UserGraphicsLayers;
});