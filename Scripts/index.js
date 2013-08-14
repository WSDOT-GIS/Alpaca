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

	"dojox/charting/Chart",
	"dojox/charting/plot2d/Pie",
	"dojox/charting/plot2d/Columns",
	"dojox/charting/action2d/Highlight",
	"dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip",
	"dojox/charting/widget/Legend",


	"dojox/charting/axis2d/Default",
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
	Graphic,
	Chart, Pie, Columns, Highlight, MoveSlice, Tooltip, Legend)
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

	function createLanguageChart(languageData) {
		var chart, anim_b, anim_c;
		chart = new Chart("languageChart", {
			title: "Language Proficiency",
			titlePos: "top",
			titleGap: 5
		});
		chart.addPlot("default", {
			type: Columns
		});
		chart.addAxis("x", {
			labels: [
				{ value: 1, text: "English" },
				{ value: 2, text: "Spanish" },
				{ value: 3, text: "IndoEu." },
				{ value: 4, text: "Asian,PI" },
				{ value: 5, text: "Other" }
			],
			dropLabels: false,
			minorLabels: false,
			//title: "Language",
			titleOrientation: "away",
			majorTickStep: 1,
			minorTickStep: 0.5,
			microTickStep: 0.25
		});
		chart.addAxis("y", {
			vertical: true,
			max: languageData.getTotal() - languageData.english,
			title: "No. of speakers"
		});
		chart.addSeries("Language Proficiency", languageData.toColumnChartSeries());
		anim_b = new Highlight(chart, "default");
		anim_c = new Tooltip(chart, "default");
		chart.render();
	}

	function createRaceChart(raceData) {
		var chart, anim_a, anim_b, anim_c, legend;
		chart = new Chart("minorityChart", {
			title: "Minority",
			titlePos: "top",
			titleGap: 5
		});
		chart.addPlot("default", {
			type: Pie,
			labels: true,
			font: "normal normal 11pt Tahoma",
			fontColor: "black",
			labelOffset: -30,
			radius: 80
		}).addSeries("Minority", raceData.toPieChartSeries());
		anim_a = new MoveSlice(chart, "default");
		anim_b = new Highlight(chart, "default");
		anim_c = new Tooltip(chart, "default");
		chart.render();
		legend = new Legend({ chart: chart }, "minorityChartLegend");
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
			var basemapGallery, layerChooser, chartDataProvider, drawToolbar, serviceAreaLayer, selectionLayer, languageChart, raceChart, aggregateLayer;

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
						// Create the symbol for the outline of the fill symbol.
						symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([0, 0, 255]), 3);
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

			/**
			 * @param drawResponse
			 * @param {esri/geometry/Geometry} drawResponse.geometry
			 * @param {esri/geometry/Geometry} drawResponse.geographicGeometry
			 */
			function setSelection(drawResponse) {
				var graphic;

				if (!selectionLayer) {
					(function () {
						var renderer, symbol;
						// Create the symbol for the outline of the fill symbol.
						symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DOT, new Color([0, 255, 0]), 3);
						symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, symbol, new Color([0, 0, 255, 0.2]));
						renderer = new SimpleRenderer(symbol);
						selectionLayer = new GraphicsLayer({
							id: "selection"
						});
						selectionLayer.setRenderer(renderer);
						map.addLayer(selectionLayer);
					}());
				}
				selectionLayer.clear();

				graphic = new Graphic(drawResponse.geometry);
				selectionLayer.add(graphic);

			}

			map = response.map;

			aggregateLayer = getAggregateLayer(map);

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

			layerChooser = new LayerChooser(response, "layerToggle", {
				omittedMapServices: /Aggregate/i
			});

			if (aggregateLayer) {
				try {
					chartDataProvider = new ChartDataProvider(aggregateLayer);
					chartDataProvider.on("query-complete", function (response) {
						if (!languageChart) {
							languageChart = createLanguageChart(response.chartData.language);
						}
						if (!raceChart) {
							raceChart = createRaceChart(response.chartData.race);
						}
					});
					chartDataProvider.on("query-error", function (response) {
						window.alert("There was an error loading the chart data.  Please reload the page.");
						if (console) {
							if (console.error) {
								console.error("ChartDataProvider query-error", response);
							}
						}
					});
				} catch (e) {
					if (console) {
						if (console.error) {
							console.error("chartDataProvider error", e);
						}
					}
				}
			} else {
				if (console) {
					if (console.error) {
						console.error("Aggregate layer not found.");
					}
				}
			}

			// Setup draw toolbar and associated buttons.
			(function (drawSAButton, drawSelButton, clearSAButton, clearSelButton ) {
				var clickHandler, clearHandler;
				drawToolbar = new Draw(map);

				drawToolbar.on("draw-complete", function (drawResponse) {
					drawToolbar.deactivate();
					drawToolbar.title6Mode = null;
					if (drawToolbar.title6Mode === "service-area") {
						setServiceArea(drawResponse);
					} else if (drawToolbar.title6Mode === "selection") {
						setSelection(drawResponse);
					}
				});

				/** Activates the draw toolbar and sets the "title6Mode" property.
				    The title6Mode property is used by the drawToolbars "draw-complete" event.
				 * @this {dijit/form/Button}
				 */
				clickHandler = function () {
					// Get the title6-mode string from the button that was clicked.
					var mode = this["data-title6-mode"];
					drawToolbar.title6Mode = mode;
					drawToolbar.activate(Draw.POLYGON);
				};

				/** Clears the graphics layer associated with the button.
				 * @this {dijit/form/Button}
				 */
				clearHandler = function () {
					var layerId, layer;
					// Get the layer ID from the button that was clicked.
					layerId = this["data-layer-id"];
					// Proceed if a data-layer-id is present.
					if (layerId) {
						// Get the graphics layer from the map.
						layer = map.getLayer(layerId);
						// Clear the graphics layer if it exists.
						if (layer) {
							layer.clear();
						}
					}
				};

				drawSAButton.on("click", clickHandler);
				drawSelButton.on("click", clickHandler);
				clearSAButton.on("click", clearHandler);
				clearSelButton.on("click", clearHandler);
			}(registry.byId("drawServiceAreaButton"), registry.byId("drawSelectionButton"), registry.byId("clearServiceAreaButton"), registry.byId("clearSelectionButton")));
		});

	});
});