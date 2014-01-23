/*global require*/
/*jslint white:true,browser:true,plusplus:true */
require([
	"dojo/ready",
	"dojo/_base/Color",
	"dojo/_base/connect",
	"dijit/registry",
	"esri/graphic",
	"esri/arcgis/utils",
	"esri/domUtils",
	"esri/dijit/BasemapGallery",
	"esri/dijit/Basemap",
	"esri/dijit/BasemapLayer",
	"alpaca/layerChooser",
	"alpaca/graphicsLayerList",
	"alpaca/chartDataProvider",
	"esri/toolbars/draw",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/tasks/GeometryService",
	"esri/InfoTemplate",
	"esri/geometry/jsonUtils",
	"alpaca/chartUtils",
	"CSV-Reader/csvArcGis",
	"layerUtils",
	"esri/config",
	"alpaca/UserGraphicsLayers",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/ImageParameters",

	"dijit/Dialog",
	"dojox/charting/axis2d/Default",
	"dojo/parser",
	"dijit/form/DropDownButton",
	"dijit/Toolbar",
	"dijit/TooltipDialog",
	"dijit/layout/AccordionContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer",
	"dijit/layout/TabContainer",
	"dijit/form/Button",
	"dijit/DropDownMenu", "dijit/MenuItem"
], function (ready, Color, connect, registry, Graphic, arcgisUtils, domUtils,
	BasemapGallery, Basemap, BasemapLayer,
	LayerChooser, GraphicsLayerList, ChartDataProvider, Draw, GraphicsLayer,
	SimpleRenderer, SimpleLineSymbol, SimpleFillSymbol,
	GeometryService, InfoTemplate,
	jsonUtils, chartUtils, csvArcGis, LayerUtils,
	esriConfig, UserGraphicsLayers, ArcGISDynamicMapServiceLayer, ImageParameters)
{
	"use strict";

	esriConfig.defaults.io.proxyUrl = "proxy.ashx";
	esriConfig.defaults.geometryService = new GeometryService("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Geometry/GeometryServer");

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

		return url;
	}

	/** Converts a string into a geometry object.
	 * @returns {esri/geometry/Geometry}
	 */
	function parseGeometry(/**{string}*/ s) {
		var json;
		if (typeof s !== "string") {
			throw new TypeError("Non-string parameter was supplied to parseGeometry method.");
		} 

		json = JSON.parse(s);
		return jsonUtils.fromJson(json);
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



		arcgisUtils.createMap("6005be3ad4d64b50b0008078b2b04ffc", "map", {
			mapOptions: {
				//basemap: "gray",
				center: window.JSON && window.localStorage && window.localStorage.alpaca_mapCenter ? JSON.parse(window.localStorage.alpaca_mapCenter) : [-120.80566406246835, 47.41322033015946],
				zoom: window.localStorage && window.localStorage.alpaca_mapZoom ? Number(window.localStorage.alpaca_mapZoom) : 7,
				showAttribution: true,
				logo: false
			}
		}).then(function (response) {
			var basemapGallery, layerChooser, graphicsLayerList, chartDataProvider, drawToolbar,
				serviceAreaLayer, selectionLayer, languageChart, raceChart, ageChart, veteranChart, povertyChart,
				aggregateLayerUrl, popupHandle, popupListener, userGraphicsLayers, pdbaLayer;

			/** Creates the service area layer and adds it to the map.
			 * @returns {esri/layers/GraphicsLayer}
			 */
			function createServiceAreaLayer() {
				var renderer, symbol, layer;

				/** Disables the AOI button if there are no service area graphics,
				 * enables it if there are S.A. graphics.
				*/
				function disableOrEnableAoiButton(/**{Graphic}*/ graphic) {
					var aoiButton = registry.byId("aoiButton");
					aoiButton.set("disabled", !layer.graphics.length);
				}

				// Create the symbol for the outline of the fill symbol.
				symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([0, 0, 255]), 3);
				symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, symbol, new Color([0, 0, 0, 0]));
				renderer = new SimpleRenderer(symbol);
				layer = new GraphicsLayer({
					id: "serviceArea"
				});
				layer.setRenderer(renderer);
				layer.on("graphic-add", disableOrEnableAoiButton);
				layer.on("graphic-remove", disableOrEnableAoiButton);
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

			/** Updates the charts in the application
			*/
			function updateCharts(/** {ChartData} */ chartData) {
				if (!languageChart) {
					languageChart = chartUtils.createLanguageChart(chartData.language);
				} else {
					// Update the language chart with the response language data.
					languageChart.updateSeries("Language Proficiency", chartData.language.toColumnChartSeries());
					languageChart.setAxisWindow("y", chartData.language.getNotEnglishZoomScale(), 0);
					languageChart.render();
				}
				if (!raceChart) {
					raceChart = chartUtils.createRaceChart(chartData.race);
				} else {
					// Update the race chart with the response race data.
					raceChart.updateSeries("Race", chartData.race.toColumnChartSeries());
					raceChart.render();
				}

				if (!ageChart) {
					ageChart = chartUtils.createAgeChart(chartData.age);
				} else {
					ageChart.updateSeries("Age", chartData.age.toColumnChartSeries());
					ageChart.render();
				}

				if (!veteranChart) {
					veteranChart = chartUtils.createVeteranChart(chartData.veteran);
				} else {
					veteranChart.updateSeries("Veterans", chartData.veteran.toColumnChartSeries());
					veteranChart.render();
				}

				if (!povertyChart) {
					povertyChart = chartUtils.createPovertyChart(chartData.poverty);
				} else {
					povertyChart.updateSeries("Poverty", chartData.poverty.toChartSeries());
					povertyChart.render();
				}



				document.forms.printForm.querySelector("[name=chartdata]").value = JSON.stringify(chartData);
			}

			/** Gets the geometry from the first graphic in the service area layer.
			 * @returns {esri/geometry/Geometry|null} Returns a geometry if possible, null otherwise.
			 */
			function getServiceAreaGraphic() {
				var output = null;
				if (serviceAreaLayer) {
					if (serviceAreaLayer.graphics.length) {
						output = serviceAreaLayer.graphics[0];
					}
				}
				return output;
			}

			/** Gets the geometry from the first graphic in the service area layer.
			 * @returns {esri/geometry/Geometry|null} Returns a geometry if possible, null otherwise.
			 */
			function getServiceAreaGeometry() {
				var output = getServiceAreaGraphic();
				if (output) {
					output = output.geometry;
				}
				return output;
			}

			/** Sets the service area to the selected geometry after clearing the selection and service area grahpics layers.
			 * Also updates the charts.
			 * @param {(esri/geometry/Geometry|esri/Graphic)} serviceArea
			 */
			function setServiceArea(serviceArea) {
				selectionLayer.clear();
				serviceAreaLayer.clear();
				if (serviceArea && serviceArea.geometry) { // Is serviceArea a graphic?
					serviceAreaLayer.add(serviceArea);
					updateCharts(new ChartDataProvider.ChartData(serviceArea.attributes));
				} else {
					chartDataProvider.getSelectionGraphics(serviceArea, map.getScale(), true);
				}
			}

			/** Sets the selection to the given geometry after clearing the selection graphics layer, then updates the charts.
			 */
			function setSelection(/**{esri/geometry/Geometry}*/ geometry) {
				selectionLayer.clear();
				chartDataProvider.getSelectionGraphics(geometry, map.getScale(), false, getServiceAreaGeometry());
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

			// Setup the progress bar to display when the map is loading data.
			map.on("update-start", function () {
				domUtils.show(document.getElementById("mapProgress"));
			});

			// Setup the progress bar to hide when the map is loading data.
			map.on("update-end", function () {
				domUtils.hide(document.getElementById("mapProgress"));
			});

			graphicsLayerList = new GraphicsLayerList(map, "graphicsLayerList", {
				omittedLayers: /(?:serviceArea)|(?:selection)|(?:\w+_\d+_\d+)|(?:user(?:(?:points)|(?:lines)|(?:polygons)))|(?:^layer\d+$)|(?:^layer_osm$)/i
			});

			var imageParameters = new ImageParameters();
			imageParameters.layerIds = [2];
			imageParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;

			// Add the PDBA layer
			pdbaLayer = new ArcGISDynamicMapServiceLayer("http://webgis.dor.wa.gov/ArcGIS/rest/services/Programs/WADOR_SalesTax/MapServer", {
				id: "PTBA",
				imageParameters: imageParameters,
				visible: false
			});

			map.addLayer(pdbaLayer);

			basemapGallery = new BasemapGallery({
				map: map,
				basemapIds: getBasemapLayerIds(),
				basemaps: [
					new Basemap({
						id: "wsdot",
						title: "WSDOT",
						thumbnailUrl: "Images/WsdotBasemapThumbnail.jpg",
						layers: [new BasemapLayer({
							url: "http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/WebBaseMapWebMercator/MapServer"
						})]
					})
				],
			}, "basemapGallery");

			basemapGallery.startup();

			try {
				layerChooser = new LayerChooser(response, "layerToggle", {
					omittedMapServices: /Aggregate/i
				});
			} catch (lcError) {
				console.error("Error creating layer chooser", lcError);
			}

			if (aggregateLayerUrl) {
				try {
					chartDataProvider = new ChartDataProvider(aggregateLayerUrl);

					chartDataProvider.on("totals-determined", updateCharts);

					chartDataProvider.on("query-complete", function (/** {ChartDataQueryResult} */ output) {
						updateCharts(output.chartData);

						document.forms.printForm.querySelector("[name=chartdata]").value = JSON.stringify(output.chartData);

						if (output.features && output.features.length) {
							(function () {
								var i, l, layer = output.type === "service area" ? serviceAreaLayer : selectionLayer;
								for (i = 0, l = output.features.length; i < l; i += 1) {
									layer.add(output.features[i]);
								}
							}());
						}

						if (output.originalGeometry) {
							userGraphicsLayers.add(output.originalGeometry);
						}
					});

					chartDataProvider.on("error", function (error) {
						if (console && console.error) {
							console.error(error);
						}
					});

					if (window.localStorage) {
						if (localStorage.alpaca_serviceAreaGraphic) {
							setServiceArea(new Graphic(JSON.parse(localStorage.alpaca_serviceAreaGraphic, function (k, v) {
								var output;
								if (k === "attributes") {
									output = new ChartDataProvider.ChartData(v);
								} else {
									output = v;
								}
								return output;
							})));
							if (localStorage.alpaca_selectionGeometry) {
								setSelection(parseGeometry(localStorage.alpaca_selectionGeometry));
							}
						}
						else if (localStorage.alpaca_selectionGeometry) {
							setSelection(parseGeometry(localStorage.alpaca_selectionGeometry));
						} else {
							chartDataProvider.getSelectionGraphics();
						}
					} else {
						chartDataProvider.getSelectionGraphics();
					}
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
						var selectionGeometry, serviceAreaGraphic, mapCenter;

						mapCenter = map.geographicExtent.getCenter();
						localStorage.setItem("alpaca_mapCenter", JSON.stringify([mapCenter.x, mapCenter.y]));
						localStorage.setItem("alpaca_mapZoom", String(map.getZoom()));
						

						// Save the selection.
						selectionGeometry = userGraphicsLayers.getGeometryForStorage();
						if (selectionGeometry) {
							localStorage.setItem("alpaca_selectionGeometry", selectionGeometry);
						} else if (localStorage.alpaca_selectionGeometry) {
							localStorage.removeItem("alpaca_selectionGeometry");
						}

						// Save the service area.
						if (serviceAreaLayer.graphics && serviceAreaLayer.graphics.length) {
							serviceAreaGraphic = serviceAreaLayer.graphics[0];
						}
						if (serviceAreaGraphic) {
							// Strip unneeded properties.
							if (serviceAreaGraphic.toJson) {
								serviceAreaGraphic = serviceAreaGraphic.toJson();
							}
							serviceAreaGraphic = JSON.stringify(serviceAreaGraphic);
							localStorage.setItem("alpaca_serviceAreaGraphic", serviceAreaGraphic);
						} else {
							localStorage.removeItem("alpaca_serviceAreaGraphic");
						}
						
						
					});


				}
				

				/**
				 * @param drawResponse
				 * @param {esri/geometry/Geometry} drawResponse.geometry
				 */
				drawToolbar.on("draw-complete", function (drawResponse) {
					drawToolbar.deactivate();
					if (drawToolbar.alpacaMode === "service-area") {
						setServiceArea(drawResponse.geometry);
					} else if (drawToolbar.alpacaMode === "selection") {
						setSelection(drawResponse.geometry);
					}
					drawToolbar.alpacaMode = null;
					// Restore the map's default on-click behavior: displaying popups.
					popupHandle = connect.connect(map, "onClick", response.clickEventListener);
				});

				/** Activates the draw toolbar and sets the "alpacaMode" property.
				    The alpacaMode property is used by the drawToolbars "draw-complete" event.
				 * @this {dijit/form/Button}
				 */
				clickHandler = function () {
					var fillSymbol, mode;

					// Get the alpaca-mode string from the button that was clicked.
					mode = this["data-alpaca-mode"];
					drawToolbar.alpacaMode = mode;
					fillSymbol = mode === "service-area" ? serviceAreaLayer.renderer.symbol : selectionLayer.renderer.symbol;
					drawToolbar.setFillSymbol(fillSymbol);
					drawToolbar.activate(Draw[this["data-geometry-type"] || "POLYGON"]);
					// Deactivate the maps default on-click behavior: displaying popups.
					connect.disconnect(popupHandle);
				};

				/** Clears the graphics layer associated with the button.
				 * @this {dijit/form/Button}
				 */
				clearHandler = function () {
					var layerId, saGeometry;
					// Get the layer ID from the button that was clicked.
					layerId = this["data-layer-id"];
					// Proceed if a data-layer-id is present.
					if (layerId) {
						if (layerId === "serviceArea" || layerId === "selection") {
							// The selection and user graphics need to be cleared even when the service area is cleared.
							selectionLayer.clear();
							userGraphicsLayers.clear();
							if (layerId === "serviceArea") {
								serviceAreaLayer.clear();
							}
						}

					}
					saGeometry = getServiceAreaGraphic();

					if (saGeometry) {
						updateCharts(saGeometry.attributes);
					} else {
						// TODO: Load stored statewide chart data from variable.
						chartDataProvider.getSelectionGraphics();
					}
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

				if (input.addEventListener) {

					input.addEventListener("change", handleFileSelect, false);
				}

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

			// Setup help button.
			(function (helpButton) {
				helpButton.on("click", function () {
					var url = this["data-url"];
					if (url) {
						window.open(url);
					}
				});
			}(registry.byId("helpButton")));

		}, function (err) {
			if (console && console.error) {
				console.error("map load error", err);
			}
		}, function (update) {
			if (console && console.log) {
				console.log("map load progress", update);
			}
		});

	});
});