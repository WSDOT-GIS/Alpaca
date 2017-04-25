/*global require */
/*jshint browser:true*/
require([
	"esri/map",
	"esri/graphic",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"gtfs-agency-select",
	"gtfs-layer-manager"
], function (Map, Graphic, GraphicsLayer, SimpleRenderer, GtfsAgencySelect, GtfsLayerManager) {
	"use strict";
	var map, agencySelect, gtfsLayerManager;

	gtfsLayerManager = new GtfsLayerManager();

	map = new Map("mapDiv", {
		basemap: "streets",
		center: [-120.80566406246835, 47.41322033015946],
		zoom: 7,
		showAttribution: true
	});

	agencySelect = document.getElementById("agencySelect");
	agencySelect = GtfsAgencySelect.createGtfsAgencySelect(agencySelect);

	agencySelect.addEventListener("gtfsreturned", function (e) {
		var layers = gtfsLayerManager.getGtfsLayers(e.detail.agencyId, e.detail.gtfs);
		map.addLayer(layers.shapesLayer);
		map.addLayer(layers.stopsLayer);
	});

	agencySelect.addEventListener("gtfserror", function (e) {
		alert(e.detail.error);
	});

});
