/*global require*/
require([
	"dojo/ready",
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
], function (ready, Map, BasemapGallery, Legend) {
	"use strict";
	ready(function () {
		var map;

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