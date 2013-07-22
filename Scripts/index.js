/*global require*/
require([
	"dojo/ready",
	"esri/arcgis/utils",
	"esri/dijit/BasemapGallery",
	"esri/dijit/Legend",
	"dojo/text!./map.txt",
	"title6/layerChooser",
	"dojo/parser",
	"dijit/form/DropDownButton",
	"dijit/TooltipDialog",
	"dijit/layout/AccordionContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer",
	"dijit/layout/TabContainer",
	"dijit/form/Button"
], function (ready, arcgisUtils, BasemapGallery, Legend, webMap, LayerChooser) {
	"use strict";

	////var mapId = "f18bec1c4af74955a02d8647e1495c20";

	////config.defaults.io.proxyUrl = "proxy.ashx";

	////urlUtils.addProxyRule({
	////	proxyUrl: "proxy.ashx",
	////	urlPrefix: location.protocol + "//www.arcgis.com/sharing/rest/content/items/" + mapId
	////});

	////urlUtils.addProxyRule({
	////	proxyUrl: "proxy.ashx",
	////	urlPrefix: location.protocol + "//demographics1.arcgis.com"
	////});

	ready(function () {
		var map;

		function getBasemapLayerIds() {
			var re, layerId, i, l, output = [];
			re = /^layer\d+$/i;
			for (i = 0, l = map.layerIds.length; i < l; i += 1) {
				layerId = map.layerIds[i];
				if (re.test(layerId)) {
					output.push(layerId);
				}
			}
			return output;
		}

		webMap = { itemData: JSON.parse(webMap) };

		arcgisUtils.createMap(webMap, "map", {
			mapOptions: {
				basemap: "gray",
				center: [-120.80566406246835, 47.41322033015946],
				zoom: 7,
				showAttribution: true
			}
		}).then(function (response) {
			var basemapGallery, legend, layerChooser;

			map = response.map;

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

		////map = new Map("map", {
		////	basemap: "gray",
		////	center: [-120.80566406246835, 47.41322033015946],
		////	zoom: 7,
		////	showAttribution: true
		////});

		////map.on("load", function () {
		////	var basemapGallery, legend;

		////	basemapGallery = new BasemapGallery({
		////		map: map
		////	}, "basemapGallery");

		////	basemapGallery.startup();

		////	legend = new Legend({
		////		map: map,
		////		autoUpdate: true
		////	}, "legend");
		////});
	});
});