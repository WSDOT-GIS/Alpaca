/*global require*/
/*jslint white:true,browser:true,plusplus:true */
require([
	"dojo/ready",
	"dojo/_base/Color",
	"dojo/_base/connect",
	"dijit/registry",
	"esri/arcgis/utils",
	"esri/domUtils",
	"esri/dijit/BasemapGallery",
	"alpaca/layerChooser",
	"alpaca/graphicsLayerList",
	"alpaca/chartDataProvider",
	"alpaca/utils",
	"esri/toolbars/draw",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/graphic",
	"esri/tasks/GeometryService",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/InfoTemplate",

	"alpaca/chartUtils",

	"CSV-Reader/csvArcGis",
	"layerUtils",

	"esri/graphicsUtils",
	"esri/config",
	"esri/geometry/jsonUtils",
	"alpaca/UserGraphicsLayers",

	"dijit/Dialog",
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
], function (ready, Color, connect, registry, arcgisUtils, domUtils, BasemapGallery,
	LayerChooser, GraphicsLayerList, ChartDataProvider, t6Utils, Draw, GraphicsLayer,
	SimpleRenderer, SimpleLineSymbol, SimpleFillSymbol,
	Graphic, GeometryService, Query, QueryTask, InfoTemplate,
	chartUtils, csvArcGis, LayerUtils,
	graphicsUtils, esriConfig, jsonUtils, UserGraphicsLayers)
{
	"use strict";

	esriConfig.defaults.io.proxyUrl = "proxy.ashx";

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
	 * @param {string} layerId
	 * @returns {boolean}
	 */
	function detectBasemapLayerId(layerId) {
		var re = /(^layer\d+$)|(^World_Light_Gray)/i;
		// Returns true if layerId is truthy (not null, undefined, 0, or emtpy string) and matches the regular expression.
		return layerId && re.test(layerId);
	}

	/** Gets the aggregate layer from the map, removes it, and then returns that layer's URL.
	 * @returns {string}
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
				center: JSON && localStorage && localStorage.title6_mapCenter ? JSON.parse(localStorage.title6_mapCenter) : [-120.80566406246835, 47.41322033015946],
				zoom: localStorage && localStorage.title6_mapZoom ? Number(localStorage.title6_mapZoom) : 7,
				showAttribution: true,
				logo: false
			}
		}).then(function (response) {
			var basemapGallery, layerChooser, graphicsLayerList, chartDataProvider, drawToolbar,
				serviceAreaLayer, selectionLayer, languageChart,
				raceChart, aggregateLayerUrl, aggregateQueryTasks, popupHandle, popupListener, userGraphicsLayers;




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

			function queryAggregateLayerForServiceArea(/** {esri/geometry/Geometry} */ geometry) {
				var query, aggregateQueryTask;

				query = new Query();
				query.geometry = geometry;
				query.returnGeometry = true;
				////query.maxAllowableOffset = 50;

				aggregateQueryTask = aggregateQueryTasks[t6Utils.getLevel(map.getScale())];

				aggregateQueryTask.execute(query, function (/** {esri/tasks/FeatureSet} */ featureSet) {
					var /** {Geometry[]} */geometries;
					if (featureSet && featureSet.features && featureSet.features.length >= 1) {
						// Clear the existing features.
						serviceAreaLayer.clear();

						if (featureSet.features.length === 1) {
							serviceAreaLayer.add(featureSet.features[0]);
						} else {
							geometries = graphicsUtils.getGeometries(featureSet.features);

							geometryService.union(geometries, function (/**{Geometry}*/ geometry) {
								var graphic;
								if (geometry) {
									graphic = new Graphic(geometry);
									serviceAreaLayer.add(graphic);
								}
							}, function (error) {
								if (console) {
									if (console.error) {
										console.error(error);
									}
								}
							});
						}


					}
				}, function (error) {
					console.error("An error occured while querying for block group geometry.", error);
				});
			}

			/**
			@param drawResponse
			@param {esri/geometry/Geometry} drawResponse.geometry
			@param {esri/geometry/Geometry} drawResponse.geographicGeometry
			*/
			function setServiceArea(drawResponse) {
				// Clear the existing graphics.
				serviceAreaLayer.clear();
				if (typeof drawResponse === "string") { // If it's a string, then its a geometry representation from localStorage.
					selectionLayer.clear();
					serviceAreaLayer.add(new Graphic(jsonUtils.fromJson(JSON.parse(drawResponse))));
				} else {
					queryAggregateLayerForServiceArea(drawResponse.geometry);
				}
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

			function queryAggregateLayerForSelection(/** {esri/geometry/Geometry} */ geometry) {
				var query, aggregateQueryTask;

				query = new Query();
				query.geometry = geometry;
				query.returnGeometry = true;
				//query.maxAllowableOffset = 50;

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
				var saGeometry, selectionGeometry;

				if (drawResponse.geometry) {
					selectionGeometry = drawResponse.geometry;
				} else if (typeof drawResponse === "string") {
					selectionGeometry = JSON.parse(drawResponse);
					selectionGeometry = jsonUtils.fromJson(selectionGeometry);
				}

				selectionLayer.clear();

				function updateCharts(geometry) {
					var graphic;

					// If a selection polygon is outside of the service area, its 
					// intersection will be a geometry with an empty "rings" property.
					// In this case we will set the geometry to null.
					if (geometry &&
						((geometry.rings && geometry.rings.length)
						||
						(geometry.points && geometry.points.length)
						||
						(geometry.paths && geometry.paths.length)
						)) {
						graphic = new Graphic(geometry);
						selectionLayer.add(graphic);
					} else {
						geometry = null;
					}

					chartDataProvider.updateCharts(geometry, map.getScale());
					queryAggregateLayerForSelection(geometry);
				}

				// Determine if there is an existing service area geometry.
				saGeometry = getServiceAreaGeometry();

				if (!saGeometry) {
					updateCharts(selectionGeometry);
				} else {
					geometryService.intersect([selectionGeometry], saGeometry, function (/** {Geometry[]} */ geometries) {
						if (geometries && geometries.length) {
							updateCharts(geometries[0]);
						} else {
							updateCharts(selectionGeometry);
						}
					}, function (/** {Error} */ error) {
						// Log an error to the console (if supported by browser);
						console.error("Error with Geometry Service intersect operation", error);
						// Update the charts with the un-intersected geometry.
						updateCharts(selectionGeometry);
					});
				}

				userGraphicsLayers.add(selectionGeometry);
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

			graphicsLayerList = new GraphicsLayerList(map, "graphicsLayerList", {
				omittedLayers: /(?:serviceArea)|(?:selection)|(?:\w+_\d+_\d+)|(?:user(?:(?:points)|(?:lines)|(?:polygons)))/i
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
							languageChart = chartUtils.createLanguageChart(response.chartData.language);
						} else {
							// Update the language chart with the response language data.
							languageChart.updateSeries("Language Proficiency", response.chartData.language.toColumnChartSeries());
							languageChart.setAxisWindow("y", response.chartData.language.getNotEnglishZoomScale(), 0);
							languageChart.render();
						}
						if (!raceChart) {
							raceChart = chartUtils.createRaceChart(response.chartData.race);
						} else {
							// Update the race chart with the response race data.
							raceChart.updateSeries("Minority", response.chartData.race.toColumnChartSeries());
							raceChart.render();
						}

						document.forms.printForm.querySelector("[name=chartdata]").value = JSON.stringify(response.chartData);
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
			(function (drawSAButton, drawSelButton, drawPointsSelButton, drawLineSelButton, clearSAButton, clearSelButton ) {
				var clickHandler, clearHandler;
				drawToolbar = new Draw(map);

				userGraphicsLayers = new UserGraphicsLayers(map);

				// Setup loading and saving to / from localStorage.
				if (!window.addEventListener || !localStorage || !JSON) {
					window.alert("This browser does not support saving of graphics. Saving of geometry requires support for window.addEventListener, window.localStorage, and window.JSON.");
				} else {
					window.addEventListener("beforeunload", function (/*e*/) {
						var selectionGeometry, serviceAreaGeometry, mapCenter;

						mapCenter = map.geographicExtent.getCenter();
						localStorage.setItem("title6_mapCenter", JSON.stringify([mapCenter.x, mapCenter.y]));
						localStorage.setItem("title6_mapZoom", String(map.getZoom()));
						

						// Save the selection.
						selectionGeometry = userGraphicsLayers.getGeometryForStorage();
						if (selectionGeometry) {
							localStorage.setItem("title6_selectionGeometry", selectionGeometry);
						} else if (localStorage.title6_selectionGeometry) {
							localStorage.removeItem("title6_selectionGeometry");
						}

						// Save the service area.
						if (serviceAreaLayer.graphics && serviceAreaLayer.graphics.length) {
							serviceAreaGeometry = serviceAreaLayer.graphics[0].geometry;
						}
						if (serviceAreaGeometry) {
							// Strip unneeded properties.
							if (serviceAreaGeometry.toJson) {
								serviceAreaGeometry = serviceAreaGeometry.toJson();
							}
							serviceAreaGeometry = JSON.stringify(serviceAreaGeometry);
							localStorage.setItem("title6_serviceAreaGeometry", serviceAreaGeometry);
						} else {
							localStorage.removeItem("title6_serviceAreaGeometry");
						}
						
						
					});

					if (localStorage.title6_serviceAreaGeometry) {
						setServiceArea(localStorage.title6_serviceAreaGeometry);
					}
					if (localStorage.title6_selectionGeometry) {
						setSelection(localStorage.title6_selectionGeometry);
					}
				}
				

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

					// Get the alpaca-mode string from the button that was clicked.
					mode = this["data-alpaca-mode"];
					drawToolbar.title6Mode = mode;
					fillSymbol = mode === "service-area" ? serviceAreaLayer.renderer.symbol : selectionLayer.renderer.symbol;
					drawToolbar.setFillSymbol(fillSymbol);
					drawToolbar.activate(Draw[this["data-geometry-type"] || "POLYGON"]);
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

						if (layerId === "selection" && userGraphicsLayers) {
							userGraphicsLayers.clear();
						}
					}
					chartDataProvider.updateCharts();
				};

				// Attach click events.
				drawSAButton.on("click", clickHandler);
				drawSelButton.on("click", clickHandler);
				drawPointsSelButton.on("click", clickHandler);
				drawLineSelButton.on("click", clickHandler);

				// Attach clear button click events.
				clearSAButton.on("click", clearHandler);
				clearSelButton.on("click", clearHandler);


			}(registry.byId("drawServiceAreaButton"),
			registry.byId("drawPolylineSelectionButton"),
			registry.byId("drawPointsSelectionButton"),
			registry.byId("drawLineSelectionButton"),
			registry.byId("clearServiceAreaButton"),
			registry.byId("clearSelectionButton")));

			registry.byId("printMenuItem").on("click", function () {
				var form;

				function getSelectionGraphics() {
					var gfx, i, l, output = [];
					gfx = selectionLayer.graphics;

					for (i = 0, l = gfx.length; i < l; i += 1) {
						output.push(gfx[i].toJson());
					}

					return output;
				}

				// Get the print form.
				form = document.forms.printForm;
				// set the values on the print form.
				form.querySelector("[name=extent]").value = JSON.stringify(map.extent.toJson());
				form.querySelector("[name=graphics]").value = JSON.stringify(getSelectionGraphics());
				form.querySelector("[name=renderer]").value = JSON.stringify(selectionLayer.renderer.toJson());
				form.submit();
			});

			// Setup the Add CSV menu item.
			(function (menuItem, dialog, input) {

				function handleFileLoad(evt) {
					var text, graphicsLayer, renderer, infoTemplate;

					text = evt.target.result;

					try {
						graphicsLayer = csvArcGis.csvToGraphicsLayer(text, ',', null, null, null, null, null, {
							id: evt.target.file.name
						});

						renderer = LayerUtils.createRandomPointRenderer();
						infoTemplate = new InfoTemplate("Imported Feature", "${*}");

						graphicsLayer.setRenderer(renderer);
						graphicsLayer.setInfoTemplate(infoTemplate);

						map.addLayer(graphicsLayer);
					} catch (e) {
						if (e instanceof TypeError) {
							window.alert(e.message);
						} else {
							throw e;
						}
					}

					dialog.hide();
				}

				function handleFileSelect(evt) {
					var file, files, reader, i, l;
					files = evt.target.files; // FileList object

					// Loop through all of the files. Create a reader for each and read the text.
					for (i = 0, l = files.length; i < l; i += 1) {
						file = files[i];
						reader = new window.FileReader();
						// Add the file as a property of the reader so its filename can be used as a layer id.
						reader.file = file;
						reader.onload = handleFileLoad;

						reader.readAsText(file);
					}
				}

				input.addEventListener("change", handleFileSelect, false);

				menuItem.on("click", function () {
					if (window.FileReader) {
						if (input.value) {
							input.value = null;
						}
						dialog.show();
					} else {
						window.alert("This operation is not supported by your browser");
					}
				});
			}(registry.byId("addDataButton"), registry.byId("addCsvDialog"), document.getElementById("addCsvFileInput")));
		});

	});
});