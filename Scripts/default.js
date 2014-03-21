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
	"esri/layers/FeatureLayer",
	"esri/layers/ArcGISTiledMapServiceLayer",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"GtfsService/gtfs-agency-select",
	"GtfsService/arcgis/gtfs-layer-manager",

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
	esriConfig, UserGraphicsLayers, FeatureLayer, ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer,
	GtfsAgencySelect, GtfsLayerManager)
{
	"use strict";

	esriConfig.defaults.io.proxyUrl = "proxy.ashx";
	esriConfig.defaults.geometryService = new GeometryService("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Geometry/GeometryServer");
	esriConfig.defaults.io.corsEnabledServers.push("wsdot.wa.gov/geoservices");

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
				serviceAreaLayer, aoiLayer, languageChart, raceChart, ageChart, veteranChart, povertyChart,
				aggregateLayerUrl, popupHandle, popupListener, userGraphicsLayers;

			/** Creates the service area layer and adds it to the map.
			 * @returns {esri/layers/GraphicsLayer}
			 */
			function createServiceAreaLayer() {
				var renderer, symbol, layer;

				/** Disables the AOI button if there are no service area graphics,
				 * enables it if there are S.A. graphics.
				*/
				function disableOrEnableAoiButton(/**{Graphic} graphic*/) {
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
					id: "aoi"
				});
				layer.setRenderer(renderer);
				map.addLayer(layer);

				return layer;
			}

			/** Extracts the level (Statewide, Service Area, or AOI) from a chart's title.
			 * @param {(Chart|string)} chart - Either a chart object or the title of a chart.
			 * @returns {string} "Statewide", "Service Area", or "AOI".
			 */
			function getLevelFromChart(chart) {
				var re, match, title = chart && chart.title ? chart.title : typeof chart === "string" ? chart : null;

				if (!title) {
					throw new TypeError("The chart parameter must be a chart or a chart title string.");
				}

				re = /\(([^)]+)\)/; // Matches (...) portion. Capture 1 is the level (e.g., "Statewide").

				match = title.match(re);

				return match ? match[1] : null;
			}

			/** Ensures standard terminolgy and casing for level label.
			 * @returns {string} Returns "Statewide", "Service Area", "AOI" if level matches one of those. Returns the original string otherwise.
			 */
			function standardizeLevelForLabel(/**{string}*/ level) {
				var output = level;
				if (level && typeof level === "string") {
					if (/Service\s?Area/i.test(level)) {
						output = "Service Area";
					} else if (/Statewide/i.test(level)) {
						output = "Statewide";
					} else if (/(?:(?:selection)|(?:A(?:rea\s)?o(?:f\s)?I(?:nterest)?))/i) {
						output = "AOI";
					}
				}

				return output;
			}

			/** Updates a chart's title and executes the correct rendering function afterword.
			 * If the new title is different than the old one, chart.fullRender() is called,
			 * otherwise chart.render() is called.
			 * @param {Chart} chart
			 * @param {string} labelRoot - E.g., "Language Proficiency"
			 * @param {string} newLevel - E.g., "Service Area", "AOI", or "Statewide"
			 */
			function updateChartTitle(chart, labelRoot, newLevel) {
				var previousLevel = getLevelFromChart(chart);
				newLevel = standardizeLevelForLabel(newLevel);
				if (newLevel !== previousLevel) {
					chart.title = [labelRoot, " (", newLevel, ")"].join("");
					chart.fullRender();
				} else {
					chart.render();
				}
			}

			/** Updates the charts in the application
			*/
			function updateCharts(/** {ChartData} */ chartData, /**{string}*/ level) {
				var previousLevel, saChartData;

				if (!(chartData instanceof ChartDataProvider.ChartData)) {
					chartData = new ChartDataProvider.ChartData(chartData);
				}

				/** Either adds or removes a chart series based on the value of `level`.
				 * @param {Chart} chart
				 * @param {string} propertyName - The name of the property of saChartData that provides data for the chart.
				 * @param {string} seriesLabel - The chart series label that will either be added or removed from the chart (depending on the level).
				 */
				function setSecondSeries(chart, propertyName, seriesLabel) {
					var chartDataObj;
					chartDataObj = saChartData ? saChartData[propertyName] : null;
					if (saChartData) {
						chart.addSeries(seriesLabel, (function () {
							return chartDataObj.toColumnChartSeries ? chartDataObj.toColumnChartSeries(level, true) : chartDataObj.toChartSeries(level, true);
						}()));
					} else {
						chart.removeSeries(seriesLabel);
					}
				}

				if (!languageChart) {
					languageChart = chartUtils.createLanguageChart(chartData.language, level);
				} else {
					previousLevel = getLevelFromChart(languageChart);
					// If this is AOI level, both Service Area and AOI data needs to be displayed on the charts.
					// Store the service area chart data in this case. Otherwise set to null.
					saChartData = level === "aoi" ? serviceAreaLayer.graphics[0].attributes : null;
					if (saChartData && !(saChartData instanceof ChartDataProvider.ChartData)) {
						saChartData = new ChartDataProvider.ChartData(saChartData);
					}

					// Update the language chart with the response language data.
					languageChart.updateSeries("Language Proficiency", chartData.language.toColumnChartSeries(level));
					languageChart.setAxisWindow("y", chartData.language.getNotEnglishZoomScale(), 0);
					// Add the second axis if necessary, remove if not
					setSecondSeries(languageChart, "language", "SA Language Proficiency");
					
					updateChartTitle(languageChart, "Language Proficiency", level);
				}
				if (!raceChart) {
					raceChart = chartUtils.createRaceChart(chartData.race, level);
				} else {
					// Update the race chart with the response race data.
					raceChart.updateSeries("Race", chartData.race.toColumnChartSeries(level));
					setSecondSeries(raceChart, "race", "SA Race");
					updateChartTitle(raceChart, "Race", level);
				}

				if (!ageChart) {
					ageChart = chartUtils.createAgeChart(chartData.age, level);
				} else {
					ageChart.updateSeries("Age", chartData.age.toColumnChartSeries(level));
					setSecondSeries(ageChart, "age", "SA Age");
					updateChartTitle(ageChart, "Age", level);
				}

				if (!veteranChart) {
					veteranChart = chartUtils.createVeteranChart(chartData.veteran, level);
				} else {
					veteranChart.updateSeries("Veterans", chartData.veteran.toColumnChartSeries(level));
					setSecondSeries(veteranChart, "veteran", "SA Veterans");
					updateChartTitle(veteranChart, "Veterans", level);
				}

				if (!povertyChart) {
					povertyChart = chartUtils.createPovertyChart(chartData.poverty, level);
				} else {
					povertyChart.updateSeries("Poverty", chartData.poverty.toChartSeries(level));
					setSecondSeries(povertyChart, "poverty", "SA Poverty");
					updateChartTitle(povertyChart, "Poverty", level);
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

			/** Sets the service area to the selected geometry after clearing the AOI and service area grahpics layers.
			 * Also updates the charts.
			 * @param {(esri/geometry/Geometry|esri/Graphic)} serviceArea
			 */
			function setServiceArea(serviceArea) {
				aoiLayer.clear();
				serviceAreaLayer.clear();
				if (serviceArea && serviceArea.geometry) { // Is serviceArea a graphic?
					serviceAreaLayer.add(serviceArea);
					updateCharts(new ChartDataProvider.ChartData(serviceArea.attributes), "Service Area");
				} else {
					chartDataProvider.getSelectionGraphics(serviceArea, map.getScale(), true);
				}
			}

			/** Sets the selection to the given geometry after clearing the AOI graphics layer, then updates the charts.
			 */
			function setSelection(/**{esri/geometry/Geometry}*/ geometry) {
				aoiLayer.clear();
				chartDataProvider.getSelectionGraphics(geometry, map.getScale(), false, getServiceAreaGeometry());
			}

			popupHandle = response.clickEventHandle;
			popupListener = response.clickEventListener;

			map = response.map;

			serviceAreaLayer = createServiceAreaLayer();
			aoiLayer = createSelectionLayer();

			// Add to the global context for debugging purposes.
			// TODO: Remove global mapLayers object.
			window.theMap = map;

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
				omittedLayers: /(?:serviceArea)|(?:aoi)|(?:\w+_\d+_\d+)|(?:user(?:(?:points)|(?:lines)|(?:polygons)))|(?:^layer\d+$)|(?:^layer_osm$)/i
			});

			// Add data layers
			(function () {
				var rtaLayer, pdbaLayer, cityLimitsLayer, mpoLayer, rtpoLayer, tribalLayer;
				// Add the PTBA layer
				rtaLayer = new FeatureLayer("http://webgis.dor.wa.gov/ArcGIS/rest/services/Programs/WADOR_SalesTax/MapServer/1", {
					id: "Regional Transportation Authority (RTA)",
					visible: false,
					styling: false,
					surfaceType: "SVG"
				});

				map.addLayer(rtaLayer);

				// Add the PTBA layer
				pdbaLayer = new FeatureLayer("http://webgis.dor.wa.gov/ArcGIS/rest/services/Programs/WADOR_SalesTax/MapServer/2", {
					id: "Public Transportation Benifit Areas (PTBA)",
					visible: false,
					styling: false,
					surfaceType: "SVG"
				});

				map.addLayer(pdbaLayer);

				cityLimitsLayer = new ArcGISTiledMapServiceLayer("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/CityLimits/MapServer", {
					id: "City Limits",
					visible: false,
					opacity: 0.6
				});
				map.addLayer(cityLimitsLayer);

				mpoLayer = new ArcGISDynamicMapServiceLayer("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/MetroPlanningOrganization/MapServer", {
					id: "Metro Planning Organization (MPO)",
					visible: false,
					opacity: 0.6

				});
				map.addLayer(mpoLayer);

				rtpoLayer = new ArcGISDynamicMapServiceLayer("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/RegionalTransportationPlanning/MapServer", {
					id: "Regional Transportation Planning Organization (RTPO)",
					visible: false,
					opacity: 0.6
				});
				map.addLayer(rtpoLayer);

				tribalLayer = new ArcGISDynamicMapServiceLayer("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/TribalReservationLands/MapServer", {
					id: "Reservation and Trust Lands",
					visible: false,
					opacity: 0.6
				});
				map.addLayer(tribalLayer);
			}());

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
				]
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

					//chartDataProvider.on("totals-determined", updateCharts);

					chartDataProvider.on("query-complete", function (/** {ChartDataQueryResult} */ output) {
						updateCharts(output.chartData, output.type);

						document.forms.printForm.querySelector("[name=chartdata]").value = JSON.stringify(output.chartData);

						if (output.features && output.features.length) {
							(function () {
								var i, l, layer = output.type === "service area" ? serviceAreaLayer : aoiLayer;
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
							(function () {
								var saGraphic = JSON.parse(localStorage.alpaca_serviceAreaGraphic, function (k, v) {
									var output;
									if (k === "attributes") {
										output = new ChartDataProvider.ChartData(v);
									} else {
										output = v;
									}
									return output;
								});

								saGraphic = new Graphic(saGraphic);
								setServiceArea(saGraphic);
								if (localStorage.alpaca_selectionGeometry) {
									setSelection(parseGeometry(localStorage.alpaca_selectionGeometry));
								}
							}());
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

				/** @typedef DrawResposne
				 * @property {esri/geometry/Geometry} geometry
				 */
				

				/**
				 * @param {DrawResponse} drawResponse
				 */
				drawToolbar.on("draw-complete", function (drawResponse) {
					drawToolbar.deactivate();
					if (drawToolbar.alpacaMode === "service-area") {
						setServiceArea(drawResponse.geometry);
					} else if (drawToolbar.alpacaMode === "aoi") {
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
					fillSymbol = mode === "service-area" ? serviceAreaLayer.renderer.symbol : aoiLayer.renderer.symbol;
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
						if (layerId === "serviceArea" || layerId === "aoi") {
							// The selection and user graphics need to be cleared even when the service area is cleared.
							aoiLayer.clear();
							userGraphicsLayers.clear();
							if (layerId === "serviceArea") {
								serviceAreaLayer.clear();
							}
						}

					}
					saGeometry = getServiceAreaGraphic();

					if (saGeometry) {
						updateCharts(saGeometry.attributes, "Service Area");
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

			// Setup print feature
			registry.byId("printMenuItem").on("click", function () {
				var form;

				/** Returns the census layer that is currently visible in the map.
				 * @returns {Layer}
				 */
				function getCensusLayer() {
					var censusUrlRe = /\bDemographic\b/;
					// Get the currently visible layers in the map that are census layers.
					var layers = map.layerIds.map(function (v) {
						return map.getLayer(v);
					}).filter(function (v) {
						return v.visible && censusUrlRe.test(v.url);
					}).map(function (v) {
						return v;
					});
					return layers.length ? layers[0] : null;
				}

				/** 
				 * @typedef {Object.<string, (string|number[])>} LayerInfo
				 * @property {string} url
				 * @property {number[]} visibleLayers - sublayer IDs of visible layers.
				 * @property {string} declaredClass - The layer type (e.g., "esri.layers.ArcGISDynamicMapServiceLayer")
				 */

				/** Gets info about a layer that can be used to recreate it on the print page.
				 * @param {Layer} layer
				 * @returns {LayerInfo}
				 */
				function getLayerData(layer) {
					return {
						url: layer.url,
						visibleLayers: layer.visibleLayers,
						declaredClass: layer.declaredClass
					};
				}

				/** Converts a graphic to JSON. For use with Array.map().
				 * @param {Graphic} graphic
				 * @returns {Object}
				 */
				function graphicToJson(graphic) {
					return graphic.toJson();
				}

				form = document.forms.printForm;
				// Get the print form.
				// set the values on the print form.
				form.elements.extent.value = JSON.stringify(map.extent.toJson());
				form.elements.aoigraphics.value = JSON.stringify(aoiLayer.graphics.map(graphicToJson));
				form.elements.aoirenderer.value = JSON.stringify(aoiLayer.renderer.toJson());
				form.elements.sagraphics.value = JSON.stringify(serviceAreaLayer.graphics.map(graphicToJson));
				form.elements.sarenderer.value = JSON.stringify(serviceAreaLayer.renderer.toJson());
				form.elements.censuslayer.value = JSON.stringify(getLayerData(getCensusLayer()));
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

				var agencySelect = GtfsAgencySelect.createGtfsAgencySelect(document.getElementById("gtfsAgencySelect"));
				var gtfsLayerManager = new GtfsLayerManager();

				agencySelect.addEventListener("gtfsreturned", function (e) {
					var layers = gtfsLayerManager.getGtfsLayers(e.detail.agencyId, e.detail.gtfs);
					map.addLayer(layers.shapesLayer);
					map.addLayer(layers.stopsLayer);
					dialog.hide();
				});

				agencySelect.addEventListener("gtfserror", function (e) {
					alert(e.detail.error);
				});
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

			// Setup county select boxes...
			require(["alpaca/countySelect"], function(countySelect) {
				var saSelect, aoiSelect;
				saSelect = document.getElementById("countyServiceAreaSelect");
				saSelect.dataset.selectType = "service area";
				aoiSelect = document.getElementById("countyAOISelect");
				aoiSelect.dataset.selectType = "aoi";
				
				// Populate the select boxes with county data.
				countySelect.createCountySelect(saSelect);
				countySelect.createCountySelect(aoiSelect);

				/**
				 * Adds a graphic to either the graphics layer corresponding to the changed select.
				 * @param {Event} e
				 */
				function selectCountyOnMap(e) {
					var select = e.target;
					if (!select.selectedOptions[0].disabled) {
						var type = select.dataset.selectType;
						var fips = Number(select.value);
						if (type === "service area") {
							serviceAreaLayer.clear();
							chartDataProvider.getCountyGraphic(fips);
						} else if (type === "aoi") {
							aoiLayer.clear();
							chartDataProvider.getCountyGraphic(fips, getServiceAreaGeometry(), map.getScale());
						}
						saSelect.selectedIndex = 0;
						aoiSelect.selectedIndex = 0;
					}
				}

				// Attach events.
				saSelect.addEventListener("change", selectCountyOnMap);
				aoiSelect.addEventListener("change", selectCountyOnMap);
			});

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