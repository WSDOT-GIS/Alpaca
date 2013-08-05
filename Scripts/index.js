/*global require*/
/*jslint browser:true */
require([
	"dojo/ready",
	"dojo/_base/connect",
	"dijit/registry",
	"esri/arcgis/utils",
	"esri/domUtils",
	"esri/dijit/BasemapGallery",
	"esri/dijit/Legend",
	"title6/layerChooser",
	"esri/toolbars/draw",
	"dojo/parser",
	"dijit/form/DropDownButton",
	"dijit/TooltipDialog",
	"dijit/layout/AccordionContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer",
	"dijit/layout/TabContainer",
	"dijit/form/Button"
], function (ready, connect, registry, arcgisUtils, domUtils, BasemapGallery, Legend, LayerChooser, Draw) {
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
			var basemapGallery, legend, layerChooser, drawServiceAreaButton, drawToolbar;

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

			connect.connect(drawToolbar, "onDrawComplete", function (e) {
				console.debug(e);
				drawToolbar.deactivate();
			});

			drawServiceAreaButton = registry.byId("drawServiceAreaButton");
			drawServiceAreaButton.on("click", function () {
				drawToolbar.activate(Draw.POLYGON);
			});
		});

	});
});