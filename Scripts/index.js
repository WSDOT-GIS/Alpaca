/*global require*/
/*jslint browser:true,plusplus:true */
require([
	"dojo/ready",
	"dojo/_base/Color",
	"dojo/_base/connect",
	"dijit/registry",
	"esri/arcgis/utils",
	"esri/domUtils",
	"esri/geometry/webMercatorUtils",
	"esri/dijit/BasemapGallery",
	"title6/layerChooser",
	"title6/chartDataProvider",
	"title6/utils",
	"esri/toolbars/draw",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/graphic",
	"esri/tasks/GeometryService",
	"esri/tasks/query",
	"esri/tasks/QueryTask",

	"dojox/charting/Chart",
	"dojox/charting/plot2d/Pie",
	"dojox/charting/plot2d/Columns",
	"dojox/charting/action2d/Highlight",
	"dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip",
	"dojox/charting/action2d/Shake",
	"dojox/charting/action2d/MouseZoomAndPan",

	"dojox/charting/axis2d/Default",
	"dojo/parser",
	"dijit/form/DropDownButton",
	"dijit/TooltipDialog",
	"dijit/layout/AccordionContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer",
	"dijit/layout/TabContainer",
	"dijit/form/Button",
	"dijit/DropDownMenu", "dijit/MenuItem"
], function (ready, Color, connect, registry, arcgisUtils, domUtils, webMercatorUtils, BasemapGallery,
	LayerChooser, ChartDataProvider, t6Utils, Draw, GraphicsLayer, SimpleRenderer, SimpleLineSymbol, SimpleFillSymbol,
	Graphic, GeometryService, Query, QueryTask,
	Chart, Pie, Columns, Highlight, MoveSlice, Tooltip, Shake, MouseZoomAndPan)
{
	"use strict";

	if (!window.console) {
		window.console = {};
	}

	if (!window.console.log) {
		window.console.log = function () {

		};
	}

	if (!window.console.error) {
		window.console.error = function () {
			window.console.log(arguments);
		};
	}

	if (!window.console.warn) {
		window.console.warn = function () {
			window.console.log(arguments);
		};
	}

	if (!window.console.debug) {
		window.console.debug = function () {
			window.console.log(arguments);
		};
	}

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

		////if (url && !/\/\d+/.test(url)) {
		////	url += "/0";
		////}

		return url;
	}

	function createLanguageChart(languageData) {
		var chart, anim_a, anim_b, anim_c, mouseZoomAndPan;
		chart = new Chart("languageChart", {
			title: "Language Proficiency",
			titlePos: "top",
			titleGap: 5
		});
		chart.addPlot("default", {
			////animate: { duration: 1000, easing: easing.linear},
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
			vertical: true
			//max: languageData.getTotal() - languageData.english,
			//title: "No. of speakers"
		});
		chart.addSeries("Language Proficiency", languageData.toColumnChartSeries());
		mouseZoomAndPan = new MouseZoomAndPan(chart, "default", { axis: "y" });
		anim_a = new Shake(chart, "default", {
			shiftX: 10,
			shiftY: 10
		});
		anim_b = new Highlight(chart, "default");
		anim_c = new Tooltip(chart, "default");
		chart.setAxisWindow("y", languageData.getNotEnglishZoomScale(), 0);
		chart.render();
		return chart;
	}

	function createRaceChart(raceData) {
		var chart, anim_a, anim_b, anim_c;
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
		return chart;
	}

	ready(function () {
		var map, geometryService;


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

		geometryService = new GeometryService("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Geometry/GeometryServer");



		arcgisUtils.createMap("b96dcdee3dfa498badcf9ea871cc1895", "map", {
			mapOptions: {
				//basemap: "gray",
				center: [-120.80566406246835, 47.41322033015946],
				zoom: 7,
				showAttribution: true,
				logo: false
			}
		}).then(function (response) {
			var basemapGallery, layerChooser, chartDataProvider, drawToolbar, serviceAreaLayer, selectionLayer, languageChart,
				raceChart, aggregateLayerUrl, aggregateQueryTasks, popupHandle, popupListener;

			/** Creates the service area layer and adds it to the map.
			 * @returns {esri/layers/GraphicsLayer}
			 */
			function createServiceAreaLayer() {
				var renderer, symbol, layer;
				// Create the symbol for the outline of the fill symbol.
				symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([0, 0, 255]), 3);
				symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, symbol, new Color([0, 0, 0, 0]));
				renderer = new SimpleRenderer(symbol);
				layer = new GraphicsLayer({
					id: "serviceArea"
				});
				layer.setRenderer(renderer);
				map.addLayer(layer);
				return layer;
			}
			/** Creates the selection layer and adds it to the map.
			 * @returns {esri/layers/GraphicsLayer}
			 */
			function createSelectionLayer() {
				var renderer, symbol, layer;
				// Create the symbol for the outline of the fill symbol.
				symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DOT, new Color([0, 255, 0]), 3);
				symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, symbol, new Color([0, 0, 255, 0.2]));
				renderer = new SimpleRenderer(symbol);
				layer = new GraphicsLayer({
					id: "selection"
				});
				layer.setRenderer(renderer);
				map.addLayer(layer);
				return layer;
			}

			/**
			@param drawResponse
			@param {esri/geometry/Geometry} drawResponse.geometry
			@param {esri/geometry/Geometry} drawResponse.geographicGeometry
			*/
			function setServiceArea(drawResponse) {
				var graphic;
				// Clear the existing graphics.
				serviceAreaLayer.clear();
				graphic = new Graphic(drawResponse.geometry);
				serviceAreaLayer.add(graphic);

			}

			/** Gets the geometry from the first graphic in the service area layer.
			 * @returns {esri/geometry/Geometry|null} Returns a geometry if possible, null otherwise.
			 */
			function getServiceAreaGeometry() {
				var output = null;
				if (serviceAreaLayer) {
					if (serviceAreaLayer.graphics.length) {
						output = serviceAreaLayer.graphics[0].geometry;
					}
				}
				return output;
			}

			function queryAggregateLayer(/** {esri/geometry/Geometry} */ geometry) {
				var query, aggregateQueryTask;

				query = new Query();
				query.geometry = geometry;
				query.returnGeometry = true;
				query.maxAllowableOffset = 50;

				aggregateQueryTask = aggregateQueryTasks[t6Utils.getLevel(map.getScale())];

				aggregateQueryTask.execute(query, function (/** {esri/tasks/FeatureSet} */ featureSet) {
					var i, l;
					if (featureSet) {
						// Clear the existing features.
						selectionLayer.clear();
						// Add the new features.
						for (i = 0, l = featureSet.features.length; i < l; i++) {
							selectionLayer.add(featureSet.features[i]);
						}
					}
				}, function (error) {
					console.error("An error occured while querying for block group geometry.", error);
				});
			}

			/**
			 * @param drawResponse
			 * @param {esri/geometry/Geometry} drawResponse.geometry
			 * @param {esri/geometry/Geometry} drawResponse.geographicGeometry
			 */
			function setSelection(drawResponse) {
				var saGeometry;

				selectionLayer.clear();

				function updateCharts(geometry) {
					var graphic = new Graphic(geometry);
					chartDataProvider.updateCharts(geometry, map.getScale());
					selectionLayer.add(graphic);
					queryAggregateLayer(geometry);
				}

				// Determine if there is an existing service area geometry.
				saGeometry = getServiceAreaGeometry();

				if (!saGeometry) {
					updateCharts(drawResponse.geometry);
				} else {
					geometryService.intersect([drawResponse.geometry], saGeometry, function (/** {Geometry[]} */ geometries) {
						if (geometries && geometries.length) {
							updateCharts(geometries[0]);
						} else {
							updateCharts(drawResponse.geometry);
						}
					}, function (/** {Error} */ error) {
						// Log an error to the console (if supported by browser);
						console.error("Error with Geometry Service intersect operation", error);
						// Update the charts with the un-intersected geometry.
						updateCharts(drawResponse.geometry);
					});
				}
			}

			popupHandle = response.clickEventHandle;
			popupListener = response.clickEventListener;

			map = response.map;
			window.map = map;

			serviceAreaLayer = createServiceAreaLayer();
			selectionLayer = createSelectionLayer();

			aggregateLayerUrl = getAggregateLayer(map);

			// Append trailing slash if not present.
			if (!/\/$/.test(aggregateLayerUrl)) {
				aggregateLayerUrl += "/";
			}

			////aggregateQueryTask = new QueryTask(aggregateLayerUrl);
			aggregateQueryTasks = {
				blockGroup: new QueryTask(aggregateLayerUrl + "0"),
				tract: new QueryTask(aggregateLayerUrl + "1"),
				county: new QueryTask(aggregateLayerUrl + "2")
			};

			// Setup the progress bar to display when the map is loading data.
			map.on("update-start", function () {
				domUtils.show(document.getElementById("mapProgress"));
			});

			// Setup the progress bar to hide when the map is loading data.
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

			if (aggregateLayerUrl) {
				try {
					chartDataProvider = new ChartDataProvider(aggregateLayerUrl);
					chartDataProvider.on("query-complete", function (response) {
						if (!languageChart) {
							languageChart = createLanguageChart(response.chartData.language);
						} else {
							// Update the language chart with the response language data.
							languageChart.updateSeries("Language Proficiency", response.chartData.language.toColumnChartSeries());
							languageChart.setAxisWindow("y", response.chartData.language.getNotEnglishZoomScale(), 0);
							languageChart.render();
						}
						if (!raceChart) {
							raceChart = createRaceChart(response.chartData.race);
						} else {
							// Update the race chart with the response race data.
							raceChart.updateSeries("Minority", response.chartData.race.toPieChartSeries());
							raceChart.render();
						}
					});
					chartDataProvider.on("query-error", function (response) {
						window.alert("There was an error loading the chart data.  Please reload the page.");
						console.error("ChartDataProvider query-error", response);
					});
				} catch (e) {
						console.error("chartDataProvider error", e);
				}
			} else {
				console.error("Aggregate layer not found.");
			}

			// Setup draw toolbar and associated buttons.
			(function (drawSAButton, drawSelButton, clearSAButton, clearSelButton ) {
				var clickHandler, clearHandler;
				drawToolbar = new Draw(map);
				

				drawToolbar.on("draw-complete", function (drawResponse) {
					drawToolbar.deactivate();
					if (drawToolbar.title6Mode === "service-area") {
						setServiceArea(drawResponse);
					} else if (drawToolbar.title6Mode === "selection") {
						setSelection(drawResponse);
					}
					drawToolbar.title6Mode = null;
					popupHandle = connect.connect(map, "onClick", response.clickEventListener);
				});

				/** Activates the draw toolbar and sets the "title6Mode" property.
				    The title6Mode property is used by the drawToolbars "draw-complete" event.
				 * @this {dijit/form/Button}
				 */
				clickHandler = function () {
					var fillSymbol, mode;

					// Get the title6-mode string from the button that was clicked.
					mode = this["data-title6-mode"];
					drawToolbar.title6Mode = mode;
					fillSymbol = mode === "service-area" ? serviceAreaLayer.renderer.symbol : selectionLayer.renderer.symbol;
					drawToolbar.setFillSymbol(fillSymbol);
					drawToolbar.activate(Draw.POLYGON);
					connect.disconnect(popupHandle);
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
					chartDataProvider.updateCharts();
				};

				// Attach click events.
				drawSAButton.on("click", clickHandler);
				drawSelButton.on("click", clickHandler);

				// Attach clear button click events.
				clearSAButton.on("click", clearHandler);
				clearSelButton.on("click", clearHandler);
			}(registry.byId("drawServiceAreaButton"), registry.byId("drawSelectionButton"), registry.byId("clearServiceAreaButton"), registry.byId("clearSelectionButton")));

			registry.byId("printMenuItem").on("click", function () {
				var center, scale, form;
				// Get the center of the map.
				center = map.extent.getCenter();
				// Convert to a pair of WGS 84 coordinate pairs.
				center = webMercatorUtils.xyToLngLat(center.x, center.y);
				scale = map.getScale();

				// Get the print form.
				form = document.forms["printForm"];
				// set the values on the print form.
				form.querySelector("[name=center]").value = JSON.stringify(center);
				form.querySelector("[name=scale]").value = scale;

				form.submit();
			});
		});

	});
});