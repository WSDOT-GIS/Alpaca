/*global require*/
/*jslint browser:true */
require([
	"dojo/ready",
	"esri/arcgis/utils",
	"esri/domUtils",
	"esri/dijit/BasemapGallery",
	"esri/dijit/Legend",
	"title6/layerChooser",
	"dojo/parser",
	"dijit/form/DropDownButton",
	"dijit/TooltipDialog",
	"dijit/layout/AccordionContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer",
	"dijit/layout/TabContainer",
	"dijit/form/Button"
], function (ready, arcgisUtils, domUtils, BasemapGallery, Legend, LayerChooser) {
	"use strict";

	ready(function () {
		var map;

		function getBasemapLayerIds() {
			var re, layerId, i, l, output = [];
			re = /(^layer\d+$)|(^World_Light_Gray)/i;
			for (i = 0, l = map.layerIds.length; i < l; i += 1) {
				layerId = map.layerIds[i];
				if (re.test(layerId)) {
					output.push(layerId);
				}
			}
			return output;
		}

		arcgisUtils.createMap("8ddc4f4f300a4d43b795f2abe62d3e2a", "map", {
			mapOptions: {
				//basemap: "gray",
				center: [-120.80566406246835, 47.41322033015946],
				zoom: 7,
				showAttribution: true
			}
		}).then(function (response) {
			var basemapGallery, legend, layerChooser;

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
				autoUpdate: true
			}, "legend");

			legend.startup();

			layerChooser = new LayerChooser(response, "layerToggle");
		});

	});
});