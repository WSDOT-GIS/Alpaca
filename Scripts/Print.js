/*global require*/
/*jslint white:true,browser:true*/
require([
	"esri/map",
	"esri/geometry/Extent",
	"esri/graphic",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"title6/languageData",
	"title6/raceData"
], function (Map, Extent, Graphic, GraphicsLayer, SimpleRenderer, LanguageData, RaceData) {
	"use strict";
	var map, qsParameters, dataDiv;

	function Parameters(dataset) {
		var propName;

		this.extent = dataset.extent ? new Extent(JSON.parse(dataset.extent)) : null;
		this.graphics = dataset.graphics ? JSON.parse(dataset.graphics) : null;
		this.renderer = dataset.renderer ? new SimpleRenderer(JSON.parse(dataset.renderer)) : null;

		this.chart = dataset.chart ? JSON.parse(dataset.chart) : null;

		if (this.chart) {
			if (this.chart.language) {
				this.chart.language = new LanguageData(this.chart.language);
			}
			if (this.chart.race) {
				this.chart.race = new RaceData(this.chart.race);
			}
		}
	}

	qsParameters = new Parameters(document.getElementById("data").dataset);

	map = new Map("map", {
		basemap: "gray",
		extent: new Extent(qsParameters.extent)
	});

	map.on("load", function () {
		var layer, g, i, l;

		layer = new GraphicsLayer();
		layer.setRenderer(qsParameters.renderer);
		map.addLayer(layer);

		for (i = 0, l = qsParameters.graphics.length; i < l; i += 1) {
			g = new Graphic(qsParameters.graphics[i]);
			layer.add(g);
		}
	});

	dataDiv = document.getElementById("data");

	dataDiv.appendChild(qsParameters.chart.language.toHtmlTable());
	dataDiv.appendChild(qsParameters.chart.race.toHtmlTable());
});

