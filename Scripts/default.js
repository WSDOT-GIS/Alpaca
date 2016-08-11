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
    "alpaca/layerSelect",
    "esri/geometry/Extent",
    "esri/dijit/HomeButton",

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
    GtfsAgencySelect, GtfsLayerManager, LayerSelect, Extent, HomeButton) {
    "use strict";

    // Setup configuration defaults.
    esriConfig.defaults.io.proxyUrl = "proxy.ashx";
    esriConfig.defaults.geometryService = new GeometryService("http://data.wsdot.wa.gov/ArcGIS/rest/services/Geometry/GeometryServer");
    // Inform the ArcGIS API about servers that we know support CORS so that it doesn't have to check each time it sends a request.
    esriConfig.defaults.io.corsEnabledServers.push("data.wsdot.wa.gov");

    // Setup dummy console.* functions for browsers that lack them to prevent exceptions from occurring.
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

    /**
     * Gets an array of integers that represent, in the database, the user-specified states.
     * @returns {Number[]}
     */
    function getCheckedStateIds() {
        var checkedItems, values = [], i, l;
        checkedItems = document.querySelectorAll("#statefilters input:checked");
        for (i = 0, l = checkedItems.length; i < l; i += 1) {
            values.push(parseInt(checkedItems[i].value, 10));
        }
        return values;
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
     * @param {Map} map
     * @returns {string} The URL of the aggregate layer (or null if no match was found).
     */
    function getAggregateLayer(map) {
        var aggregateRe = /Aggregate/i, i, l, layerId, layer, url = null;

        // Loop through all of the map layer IDs, stopping when a match is found.
        for (i = 0, l = map.layerIds.length; i < l; i += 1) {
            if (aggregateRe.test(map.layerIds[i])) {
                layerId = map.layerIds[i];
                break;
            }
        }
        // If a match was found, store its URL and remove the layer from the map.
        if (layerId) {
            layer = map.getLayer(layerId);
            url = layer.url;
            map.removeLayer(layer);
        }

        // Return the aggregate layer URL.
        return url;
    }

    /** Converts a string into a geometry object.
     * @returns {"esri/geometry/Geometry"}
     */
    function parseGeometry(/**{string}*/ s) {
        var json;
        if (typeof s !== "string") {
            throw new TypeError("Non-string parameter was supplied to parseGeometry method.");
        }

        json = JSON.parse(s);
        return jsonUtils.fromJson(json);
    }

    // When the dojo framework code is ready...
    ready(function () {
        var map;

        /**
         * Converts a layer's LasyerInfo objects into layer definintion strings.
         * @param {LayerInfo[]} layerInfos
         * @param {Number[]} stateIds
         * @returns {string[]}
         */
        function getLayerDefinitions(layerInfos, stateIds) {
            var layerDefinitions = [];
            layerInfos.forEach(function (layerInfo) {
                if (layerInfo && (!layerInfo.sublayerIds || layerInfo.sublayerIds.length === 0)) {
                    layerDefinitions[layerInfo.id] = "State IN (" + stateIds.join(",") + ")";
                }
            });
            return layerDefinitions;
        }

        /**
         * Updates the layer definitions of the multi-state map layers to match the state checkboxes.
         */
        function setLayerDefinitionForStateFilters() {
            var stateIds = getCheckedStateIds();
            var includeRe = /(?:(Boundaries)|(Language)|(Minority)|(Poverty)|(Veterans)|(Age)|(Disability))_\d+$/i;
            map.layerIds.forEach(function (layerId) {
                var layer;
                // Ignore basemap layers.
                if (includeRe.test(layerId)) {
                    layer = map.getLayer(layerId);

                    if (layer.setDefaultLayerDefinitions && layer.setLayerDefinitions) {
                        if (stateIds.length === 3) {
                            layer.setDefaultLayerDefinitions();
                        } else {
                            layer.setLayerDefinitions(getLayerDefinitions(layer.layerInfos, stateIds));
                        }
                    }
                }
            });
        }

        /**
         * Gets the layer ids of all basemap layers currently in the map.
         * @returns {Array} An array of layer ID strings.
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

        // Create a map using an ArcGIS Online map ID. The map's center and zoom extent are set based on values stored in
        // localStorage if available; otherwise default values are used.
        arcgisUtils.createMap("a2a177ec2ddc4769958cb2823ba61020", "map", {
            mapOptions: {
                center: window.JSON && window.localStorage && window.localStorage.alpaca_mapCenter ? JSON.parse(window.localStorage.alpaca_mapCenter) : [-120.80566406246835, 47.41322033015946],
                zoom: window.localStorage && window.localStorage.alpaca_mapZoom ? Number(window.localStorage.alpaca_mapZoom) : 7,
                showAttribution: true,
                logo: false
            }
        }).then(function (response) { // Once the map has loaded...
            var basemapGallery, layerChooser, graphicsLayerList, chartDataProvider, drawToolbar,
                serviceAreaLayer, aoiLayer, languageChart, raceChart, ageChart, veteranChart, povertyChart, disabilityChart,
                aggregateLayerUrl, popupHandle, popupListener, userGraphicsLayers;

            // setup the state route filter checkboxes.
            // Attach event handlers.
            (function (stateCheckboxes) {
                var cb;
                function clear() {
                    setServiceArea();
                }
                for (var i = 0, l = stateCheckboxes.length; i < l; i += 1) {
                    cb = stateCheckboxes[i];
                    cb.addEventListener("click", setLayerDefinitionForStateFilters);
                    cb.addEventListener("click", clear);
                }
            }(document.querySelectorAll("#statefilters input")));

            /** Creates the service area graphics layer and adds it to the map.
             * @returns {"esri/layers/GraphicsLayer"}
             */
            function createServiceAreaLayer() {
                var renderer, symbol, layer;

                /**
                 * Disables the AOI button if there are no service area graphics,
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

            /**
             * Creates the selection layer and adds it to the map.
             * @returns {"esri/layers/GraphicsLayer"}
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

                re = /\(([^)]+)\)/; // Matches "(…)" portion. Capture 1 is the level (e.g., "Statewide").

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

            /**
             * Updates a chart's title and executes the correct rendering function afterword.
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

            /**
             * Updates the charts in the application
             * @param {ChartData} chartData
             * @param {string} level
             */
            function updateCharts(chartData, level) {
                var previousLevel, saChartData;

                // Ensure that the chartData object is the correct type instead of a regular Object.
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
                        chart.moveSeriesToFront(seriesLabel);
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

                if (!disabilityChart) {
                    disabilityChart = chartUtils.createDisabilityChart(chartData.disability, level);
                } else {
                    disabilityChart.updateSeries("Disability", chartData.disability.toColumnChartSeries(level));
                    setSecondSeries(disabilityChart, "disability", "SA Disability");
                    updateChartTitle(disabilityChart, "Disability", level);
                }



                // Add the chart data JSON string to the chart data hidden input on the print form.
                document.forms.printForm.querySelector("[name=chartdata]").value = JSON.stringify(chartData);
            }

            /** Gets the geometry from the first graphic in the service area layer.
             * @returns {?"esri/geometry/Geometry"} Returns a geometry if possible, null otherwise.
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
             * @returns {?"esri/geometry/Geometry"} Returns a geometry if possible, null otherwise.
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
             * @param {("esri/geometry/Geometry"|"esri/Graphic")} serviceArea
             */
            function setServiceArea(serviceArea) {
                aoiLayer.clear();
                serviceAreaLayer.clear();
                if (serviceArea && serviceArea.geometry) { // Is serviceArea a graphic?
                    serviceAreaLayer.add(serviceArea);
                    updateCharts(new ChartDataProvider.ChartData(serviceArea.attributes), "Service Area");
                } else {
                    chartDataProvider.getSelectionGraphics(serviceArea, map.getScale(), true, undefined, getCheckedStateIds());
                }
            }

            /**
             * Sets the selection to the given geometry after clearing the AOI graphics layer, then updates the charts.
             * @param {"esri/geometry/Geometry"} geometry
             */
            function setSelection(geometry) {
                aoiLayer.clear();
                chartDataProvider.getSelectionGraphics(geometry, map.getScale(), false, getServiceAreaGeometry(), getCheckedStateIds());
            }

            popupHandle = response.clickEventHandle;
            popupListener = response.clickEventListener;

            map = response.map;

            setLayerDefinitionForStateFilters();

            serviceAreaLayer = createServiceAreaLayer();
            aoiLayer = createSelectionLayer();

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

            /**
             * Create the Home button using the extent from the AGOL map definition.
             */
            (function (extCoords) {
                HomeButton({
                    map: map,
                    extent: new Extent(extCoords[0][0], extCoords[0][1], extCoords[1][0], extCoords[1][1])
                }, "homebutton");

                // Create the graphics layer list.
                graphicsLayerList = new GraphicsLayerList(map, "graphicsLayerList", {
                    omittedLayers: /(?:serviceArea)|(?:aoi)|(?:\w+_\d+_\d+)|(?:user(?:(?:points)|(?:lines)|(?:polygons)))|(?:^layer\d+$)|(?:^layer_osm$)/i
                });
            }(response.itemInfo.item.extent));

            // Add data layers
            (function () {
                var rtaLayer, pdbaLayer, cityLimitsLayer, mpaLayer, rtpoLayer, tribalLayer;
                // Add the PTBA layer
                rtaLayer = new FeatureLayer("http://webgis.dor.wa.gov/ArcGIS/rest/services/Programs/WADOR_SalesTax/MapServer/1", {
                    id: "Regional Transportation Authority (RTA)",
                    className: "rta",
                    outFields: ["RTA_NAME"],
                    visible: false,
                    styling: false,
                    surfaceType: "SVG"
                });

                map.addLayer(rtaLayer);

                // Add the PTBA layer
                pdbaLayer = new FeatureLayer("http://webgis.dor.wa.gov/ArcGIS/rest/services/Programs/WADOR_SalesTax/MapServer/2", {
                    id: "Public Transportation Benefit Areas (PTBA)",
                    className: "ptba",
                    outFields: ["PTBA_NAME"],
                    visible: false,
                    styling: false,
                    surfaceType: "SVG"
                });

                map.addLayer(pdbaLayer);

                cityLimitsLayer = new ArcGISDynamicMapServiceLayer("http://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/CityLimits/MapServer", {
                    id: "City Limits",
                    visible: false,
                    opacity: 0.6
                });
                map.addLayer(cityLimitsLayer);

                mpaLayer = new ArcGISDynamicMapServiceLayer("http://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/MetroPlanningAreas/MapServer", {
                    id: "Metro Planning Areas (MPA)",
                    visible: false,
                    opacity: 0.6

                });
                map.addLayer(mpaLayer);

                rtpoLayer = new ArcGISDynamicMapServiceLayer("http://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/RegionalTransportationPlanning/MapServer", {
                    id: "Regional Transportation Planning Organization (RTPO)",
                    visible: false,
                    opacity: 0.6
                });
                map.addLayer(rtpoLayer);

                tribalLayer = new ArcGISDynamicMapServiceLayer("http://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/TribalReservationLands/MapServer", {
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
                            url: "http://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/WebBaseMapWebMercator/MapServer"
                        })]
                    })
                ]
            }, "basemapGallery");

            basemapGallery.startup();

            // Set up the layer chooser.
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
                            chartDataProvider.getSelectionGraphics(undefined, undefined, undefined, undefined, getCheckedStateIds());
                        }
                    } else {
                        chartDataProvider.getSelectionGraphics(undefined, undefined, undefined, undefined, getCheckedStateIds());
                    }
                } catch (e) {
                    console.error("chartDataProvider error", e);
                }
            } else {
                console.error("Aggregate layer not found.");
            }

            // Setup draw toolbar and associated buttons.
            (function (drawSAButton, drawSelButton, drawPointsSelButton, drawLineSelButton, clearSAButton, clearSelButton) {
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
                 * @property {"esri/geometry/Geometry"} geometry
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
                 * @this {"dijit/form/Button"}
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
                 * @this {"dijit/form/Button"}
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
                        chartDataProvider.getSelectionGraphics(undefined, undefined, undefined, undefined, getCheckedStateIds());
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

                // Only enable GTFS if the CustomEvent constructor is available.
                // Otherwise show an error message.
                if (typeof CustomEvent === 'function') {
                    (function () {
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
                    }());
                } else {
                    (function () {
                        var agencySelect = document.getElementById("gtfsAgencySelect");
                        var parent = agencySelect.parentElement;
                        var newNode = document.createElement("p");
                        newNode.textContent = "This feature is not supported in this browser.";
                        parent.replaceChild(newNode, agencySelect);
                    }());
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
            require(["alpaca/countySelect"], function (countySelect) {
                var saSelect, aoiSelect;
                saSelect = document.getElementById("countyServiceAreaSelect");
                ////saSelect.dataset.selectType = "service area";
                saSelect.setAttribute("data-select-type", "service area");
                aoiSelect = document.getElementById("countyAOISelect");
                ////aoiSelect.dataset.selectType = "aoi";
                aoiSelect.setAttribute("data-select-type", "aoi");

                // Populate the select boxes with county data.
                countySelect.createCountySelect(saSelect);
                countySelect.createCountySelect(aoiSelect);

                /**
                 * Zooms to result.features[0].graphic.geometry.getExtent()
                 * @param {ChartDataQueryResult} result
                 */
                function zoomToResult(result) {
                    if (result && result.features) {
                        var graphic = result.features[0];
                        if (graphic && graphic.geometry && graphic.geometry.getExtent) {
                            map.setExtent(graphic.geometry.getExtent());
                        }
                    }
                }

                /**
                 * Adds a graphic to either the graphics layer corresponding to the changed select.
                 * @param {Event} e
                 */
                function selectCountyOnMap(e) {
                    var select = e.target;
                    if (!select.options[select.selectedIndex].disabled) {
                        var type = select.getAttribute("data-select-type"); //select.dataset.selectType;
                        var fips = Number(select.value);
                        if (type === "service area") {
                            serviceAreaLayer.clear();
                            chartDataProvider.getCountyGraphic(fips).then(zoomToResult);
                        } else if (type === "aoi") {
                            aoiLayer.clear();
                            chartDataProvider.getCountyGraphic(fips, getServiceAreaGeometry(), map.getScale()).then(zoomToResult);
                        }
                        saSelect.selectedIndex = 0;
                        aoiSelect.selectedIndex = 0;
                    }
                }

                // Attach events.
                saSelect.addEventListener("change", selectCountyOnMap);
                aoiSelect.addEventListener("change", selectCountyOnMap);
            });

            (function () {
                var saContainer = document.getElementById("saLayerSelectContainer"), aoiContainer = document.getElementById("aoiLayerSelectContainer");

                var validLayersRe = /^(?:(?:Regional Transportation Authority \(RTA\))|(?:Public Transportation Benefit Areas \(PTBA\))|(?:City Limits)|(?:Metro Planning Organization \(MPO\))|(?:Regional Transportation Planning Organization \(RTPO\))|(?:Reservation and Trust Lands))$/i;
                var sublayerIds = {
                    "City Limits": 2
                };

                /**
                 * @this {LayerSelect}
                 */
                function selectFeatures(/**{Graphic}*/ feature) {
                    var select, selectType;
                    /*jshint validthis:true*/
                    select = this.select;
                    /*jshint validthis:false*/

                    selectType = select.getAttribute("data-select-type"); //select.dataset.selectType;
                    /*jshint eqnull:true*/
                    if (feature != null) {
                        /*jshint eqnull:false*/
                        map.setExtent(feature.geometry.getExtent());

                        if (selectType === "service area") {
                            serviceAreaLayer.clear();
                            chartDataProvider.getSelectionGraphics(feature.geometry, map.getScale(), true, undefined, getCheckedStateIds());
                        } else if (selectType === "aoi") {
                            aoiLayer.clear();
                            chartDataProvider.getSelectionGraphics(feature.geometry, map.getScale(), false, getServiceAreaGeometry(), getCheckedStateIds());
                        }
                    }
                    select.selectedIndex = 0;
                }

                function setToFirstElement() {
                    /*jshint validthis:true*/
                    this.select.selectedIndex = 0;
                    this.select.disabled = false;
                    /*jshint validthis:false*/
                }

                /**
                 * @typedef LayerAddResponse
                 * @property {Layer} layer
                 * @property {Map} target
                 */

                /**
                 * Adds layer select boxes (one for service area and one for AOI) for the added layer.
                 * @property {LayerAddResponse} response
                 */
                function addSelectsForLayer(response) {
                    var layer = response.layer;
                    if (layer && layer.id && validLayersRe.test(layer.id)) { //layer && layer.url) {
                        [saContainer, aoiContainer].forEach(function (div) {
                            var select = document.createElement("select");
                            select.disabled = true;
                            if (select.classList) {
                                select.classList.add("layer-select");
                            } else {
                                select.setAttribute("class", "layer-select");
                            }
                            ////select.dataset.selectType = div === saContainer ? "service area" : "aoi";
                            select.setAttribute("data-select-type", div === saContainer ? "service area" : "aoi");
                            var option = document.createElement("option");
                            option.disabled = true;
                            option.textContent = [layer.id, "…"].join("");
                            select.appendChild(option);
                            div.appendChild(select);
                            var layerSelect = new LayerSelect(select, layer, sublayerIds[layer.id] || 0);
                            layerSelect.on("features-loaded", setToFirstElement);
                            layerSelect.on("feature-select", selectFeatures);
                        });
                    }
                }

                map.on("layer-add", addSelectsForLayer);
            }());

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