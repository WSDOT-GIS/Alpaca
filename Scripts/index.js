/*global require*/
require([
	"dojo/ready",
	"esri/config",
	"esri/urlUtils",
	"esri/arcgis/utils",
	"esri/map",
	"esri/dijit/BasemapGallery",
	"esri/dijit/Legend",
	"dojo/parser",
	"dijit/form/DropDownButton",
	"dijit/TooltipDialog",
	"dijit/layout/AccordionContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer",
	"dijit/layout/TabContainer",
	"dijit/form/Button"
], function (ready, config, urlUtils, arcgisUtils, Map, BasemapGallery, Legend) {
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

		////arcgisUtils.createMap(mapId, "map", {
		////	mapOptions: {
		////		basemap: "gray",
		////		center: [-120.80566406246835, 47.41322033015946],
		////		zoom: 7,
		////		showAttribution: true
		////	}
		////}).then(function (response) {
		////	map = response.map;

		////	map.on("load", function () {
		////		var basemapGallery, legend;

		////		basemapGallery = new BasemapGallery({
		////			map: map
		////		}, "basemapGallery");

		////		basemapGallery.startup();

		////		legend = new Legend({
		////			map: map,
		////			autoUpdate: true
		////		}, "legend");
		////	});
		////});

		map = new Map("map", {
			basemap: "gray",
			center: [-120.80566406246835, 47.41322033015946],
			zoom: 7,
			showAttribution: true
		});

		map.on("load", function () {
			var basemapGallery, legend;

			basemapGallery = new BasemapGallery({
				map: map
			}, "basemapGallery");

			basemapGallery.startup();

			legend = new Legend({
				map: map,
				autoUpdate: true
			}, "legend");
		});
	});
});