/*global require*/
/*jslint browser:true */
require([
	"dojo/ready",
	"dojo/_base/Color",
	"dijit/registry",
	"esri/arcgis/utils",
	"esri/domUtils",
	"esri/dijit/BasemapGallery",
	"esri/dijit/Legend",
	"title6/layerChooser",
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
	Legend, LayerChooser, Draw, GraphicsLayer, SimpleRenderer, SimpleLineSymbol, SimpleFillSymbol,
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

	/**
	* @param response The response of the arcgisUtils/createMap operation. See https://developers.arcgis.com/en/javascript/jshelp/intro_webmap.html
	* @param {esri/Map} response.map
	* @param {Object} response.itemInfo
	* @param {Object} response.itemInfo.itemData
	* @param {Object} response.itemInfo.itemData.baseMap
	* @param {Array} response.itemInfo.itemData.operationalLayers
	* @param {Object} response.clickEventHandle
	* @param {Object} response.clickEventListener
	* @param {Array} response.errors
	*/
	function getLayerInfosForLegend(response) {
		var output = [], operationalLayers, layer, i, l;

		operationalLayers = response.itemInfo.itemData.operationalLayers;

		for (i = 0, l = operationalLayers.length; i < l; i += 1) {
			layer = operationalLayers[i];
			if (!layer.featureCollection) {
				output.push({
					layer: layer.layerObject,
					title: layer.title
				});
			}
		}

		return output;
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
				showAttribution: true
			}
		}).then(function (response) {
			var basemapGallery, legend, layerChooser, drawToolbar, serviceAreaLayer;

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

			legend = new Legend({
				map: map,
				autoUpdate: true,
				layerInfos: getLayerInfosForLegend(response)
			}, "legend");


			layerChooser = new LayerChooser(response, "layerToggle");
			layerChooser.on("sublayer-select", function () {
				legend.refresh();
			});

			legend.startup();

			drawToolbar = new Draw(map);

			drawToolbar.on("draw-complete", function (e) {
				drawToolbar.deactivate();
				setServiceArea(e);
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