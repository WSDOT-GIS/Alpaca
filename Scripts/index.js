/*global require*/
/*jslint browser:true */
require([
	"dojo/ready",
	"dojo/_base/Color",
	"dijit/registry",
	"esri/arcgis/utils",
	"esri/domUtils",
	"esri/dijit/BasemapGallery",
	"title6/layerChooser",
	"title6/chartDataProvider",
	"esri/toolbars/draw",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/graphic",
	"dojo/parser",
	"dijit/form/DropDownButton",
	"dijit/TooltipDialog",
	"dijit/layout/AccordionContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer",
	"dijit/layout/TabContainer",
	"dijit/form/Button"
], function (ready, Color, registry, arcgisUtils, domUtils, BasemapGallery,
	LayerChooser, ChartDataProvider, Draw, GraphicsLayer, SimpleRenderer, SimpleLineSymbol, SimpleFillSymbol,
	Graphic)
{
	"use strict";

	/** Determines if layer is a basemap layer based on its layer ID.
	 * @param {String} layerId
	 * @returns {Boolean}
	 */
	function detectBasemapLayerId(layerId) {
		var re = /(^layer\d+$)|(^World_Light_Gray)/i;
		// Returns true if layerId is truthy (not null, undefined, 0, or emtpy string) and matches the regular expression.
		return layerId && re.test(layerId);
	}

	/** Gets the aggregate layer from the map, removes it, and then returns that layer's URL.
	 * @returns {String}
	 */
	function getAggregateLayer(/**{Map}*/ map) {
		var aggregateRe = /Aggregate/i, i, l, layerId, layer, url = null;

		for (i = 0, l = map.layerIds.length; i < l; i += 1) {
			if (aggregateRe.test(map.layerIds[i])) {
				layerId = map.layerIds[i];
				break;
			}
		}

		if (layerId) {
			layer = map.getLayer(layerId);
			url = layer.url;
			map.removeLayer(layer);
		}

		if (url && !/\/\d+/.test(url)) {
			url += "/0";
		}

		return url;
	}

	ready(function () {
		var map;


		/** Gets the layer ids of all basemap layers currently in the map.
		@returns {Array} An array of layer ID strings.
		*/
		function getBasemapLayerIds() {
			var layerId, i, l, output = [];
			for (i = 0, l = map.layerIds.length; i < l; i += 1) {
				layerId = map.layerIds[i];
				if (detectBasemapLayerId(layerId)) {
					output.push(layerId);
				}
			}
			return output;
		}



		arcgisUtils.createMap("68303ea67e47418ab134ca3c0d3ba3a4", "map", {
			mapOptions: {
				//basemap: "gray",
				center: [-120.80566406246835, 47.41322033015946],
				zoom: 7,
				showAttribution: true,
				logo: false
			}
		}).then(function (response) {
			var basemapGallery, layerChooser, chartDataProvider, drawToolbar, serviceAreaLayer;

			/**
			@param drawResponse
			@param {esri/geometry/Geometry} drawResponse.geometry
			@param {esri/geometry/Geometry} drawResponse.geographicGeometry
			*/
			function setServiceArea(drawResponse) {
				var graphic;

				// Create the layer if it does not already exist.
				if (!serviceAreaLayer) {
					(function () {
						var renderer, symbol;
						symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([255, 0, 0]), 3);
						symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, symbol, new Color([0,0,0,0]));
						renderer = new SimpleRenderer(symbol);
						serviceAreaLayer = new GraphicsLayer({
							id: "serviceArea"
						});
						serviceAreaLayer.setRenderer(renderer);
						map.addLayer(serviceAreaLayer);
					}());
				}
				// Clear the existing graphics.
				serviceAreaLayer.clear();

				

				graphic = new Graphic(drawResponse.geometry);
				serviceAreaLayer.add(graphic);

			}

			map = response.map;

			// Setup the progress bar to display when the map is loading data.
			map.on("update-start", function () {
				domUtils.show(document.getElementById("mapProgress"));
			});

			map.on("update-end", function () {
				domUtils.hide(document.getElementById("mapProgress"));
			});

			basemapGallery = new BasemapGallery({
				map: map,
				basemapIds: getBasemapLayerIds()
			}, "basemapGallery");

			basemapGallery.startup();

			layerChooser = new LayerChooser(response, "layerToggle");

			try {
				chartDataProvider = new ChartDataProvider(getAggregateLayer(map));
				chartDataProvider.on("query-complete", function (chartData) {
					console.log(chartData);
				});
				chartDataProvider.on("query-error", function () {
					console.error(arguments);
				});
			} catch (e) {
				console.error("chartDataProviderError", e);
			}

			drawToolbar = new Draw(map);

			drawToolbar.on("draw-complete", function (drawResponse) {
				drawToolbar.deactivate();
				setServiceArea(drawResponse);
			});

			registry.byId("drawServiceAreaButton").on("click", function () {
				drawToolbar.activate(Draw.POLYGON);
			});

			registry.byId("clearServiceAreaButton").on("click", function () {
				if (serviceAreaLayer) {
					serviceAreaLayer.clear();
				}
			});
		});

	});
});