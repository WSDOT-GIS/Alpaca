/*global define,Terraformer*/
define([
	"esri/graphic",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
], function (Graphic, GraphicsLayer, SimpleRenderer) {

	/**
	 * @property {Object} gtfs
	 * @property {string} agencyId
	 * @property {esri/layers/GraphicsLayer} stopsLayer
	 * @property {esri/layers/GraphicsLayer} shapesLayer
	 */
	function AgencyLayerCollection(gtfs, agencyId) {
		this.gtfs = gtfs;
		this.agencyId = agencyId;

		/** Converts a GeoJSON feature collection into an array of Graphics and then adds them to a layer.
		 * @param {GraphicsLayer} layer
		 * @param {Terraformer.FeatureCollection} features
		 * @param {string} type - "shape" or "stop"
		 * @return {Graphic[]}
		 */
		function addGraphicsFromGeoJsonFeatureCollection(layer, features) {
			var graphics = Terraformer.ArcGIS.convert(features);
			graphics.forEach(function (f) {
				var graphic = new Graphic(f);
				layer.add(graphic);
			});
			return graphics;
		}

		/** Creates a graphics layer
		 * @param {string} type - Either "shape" or "stop"
		 * @param {Terraformer.FeatureCollection} features
		 * @return {GraphicsLayer}
		 */
		function createLayer(type, features) {
			var suffix = type + "s", renderer;

			renderer = type === "stop" ? new SimpleRenderer({
				type: "simple",
				label: "",
				description: "",
				symbol: {
					color: [210, 105, 30, 191],
					size: 6,
					angle: 0,
					xoffset: 0,
					yoffset: 0,
					type: "esriSMS",
					style: "esriSMSCircle",
					outline: {
						color: [0, 0, 128, 255],
						width: 0,
						type: "esriSLS",
						style: "esriSLSSolid"
					}
				}
			}) : null;

			var layer = new GraphicsLayer({
				id: [agencyId, suffix].join("-"),
				className: ["gtfs", suffix].join("-"),
				styling: Boolean(renderer)
			});

			if (renderer) {
				layer.setRenderer(renderer);
			}
			addGraphicsFromGeoJsonFeatureCollection(layer, features, type);

			return layer;
		}

		this.stopsLayer = createLayer("stop", this.gtfs.Stops);
		this.shapesLayer = createLayer("shape", this.gtfs.Shapes);
	}

	function GtfsLayerManager() {
		this.agencies = {};
	}

	/** Returns the Graphics layers for an agency. Creates data layers out of GTFS data if they have not already been created.
	 * @param {string} agencyId
	 * @param {Object} gtfs
	 * @returns {AgencyLayerCollection}
	*/
	GtfsLayerManager.prototype.getGtfsLayers = function (agencyId, gtfs) {
		var output;
		if (this.agencies[agencyId]) {
			output = this.agencies[agencyId];
		} else {
			output = new AgencyLayerCollection(gtfs, agencyId);
			this.agencies[agencyId] = output;
		}
		return output;
	};

	return GtfsLayerManager;
});