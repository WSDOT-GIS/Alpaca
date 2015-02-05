/*global require*/
/*jslint white:true,browser:true*/
require([
	"dojo/number",
	"esri/map",
	"esri/geometry/Extent",
	"esri/graphic",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/ImageParameters",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"alpaca/ageData",
	"alpaca/languageData",
	"alpaca/povertyData",
	"alpaca/raceData",
	"alpaca/veteranData"
], function (number, Map, Extent, Graphic, ArcGISDynamicMapServiceLayer, ImageParameters, GraphicsLayer, SimpleRenderer, AgeData, LanguageData, PovertyData, RaceData, VeteranData) {
	"use strict";
	var map, qsParameters, dataDiv;

	function getTotal(/**{object.<string,number>}*/ o, /**{Regexp}*/ propertiesToInclude) {
		var total = 0, propName, v;
		for (propName in o) {
			if (o.hasOwnProperty(propName) && (propertiesToInclude ? propertiesToInclude.test(propName) : true)) {
				v = o[propName];
				total += v;
			}
		}
		return total;
	}

	/**
	 * @callback labelFunction
	 * @param {string} propertyName
	 */

	/** Converts an object into an HTML table.
	 * @param {Object.<string, number>} o
	 * @param {labelFunction} labelFunction - A function that converts a property name into a label.
	 * @param {string} caption - The value that will be used for the table's caption.
	 * @param {string} propertyHeader - This will be the header for the label column.
	 * @param {Regexp} propertiesToInclude - A regular expression specifying which properties to include.
	 * @returns {HTMLTableElement}
	*/
	function toHtmlTable(o, labelFunction, caption, propertyHeader, propertiesToInclude) {
		var table = document.createElement("table"), total = getTotal(o, propertiesToInclude), thead, captionElement;

		if (caption) {
			captionElement = table.createCaption();
			captionElement.textContent = caption;
		}

		function addRow(propertyName) {
			var row, cell, v;
			row = table.insertRow();
			v = o[propertyName];

			cell = row.insertCell();
			cell.textContent = labelFunction ? labelFunction(propertyName) : propertyName;
			cell = row.insertCell(-1);
			cell.textContent = typeof v === "object" ? toHtmlTable(v, labelFunction) : number.format(v);
			cell = row.insertCell(-1);
			cell.textContent = [number.format((v / total) * 100, { places: 2 }), "%"].join("");
		}

		(function () {
			var propName;
			for (propName in o) {
				if (o.hasOwnProperty(propName) && (propertiesToInclude ? propertiesToInclude.test(propName) : true)) {
					addRow(propName);
				}
			}
		}());

		thead = table.createTHead();
		thead.innerHTML = ["<tr><th>", propertyHeader || caption || "", "</th><th>Count</th><th>%</th></tr>"].join("");
		table.createTBody();

		return table;
	}

	/** Used by JSON.parse() to create chart data objects instead of generic objects.
	 * @param {string} k - The name of the current property.
	 * @param {*} v - The current value.
	 * @returns {*}
	 */
	function chartReviver(k, v) {
		var output = v;
		if (k === "age") {
			output = new AgeData(v);
		} else if (k === "language") {
			output = new LanguageData(v);
		} else if (k === "poverty") {
			output = new PovertyData(v);
		} else if (k === "veteran") {
			output = new VeteranData(v);
		} else if (k === "race") {
			output = new RaceData(v);
		}
		return output;
	}

	/** Reads information from the data tags of an HTML element.
	 * @param {HTMLElement} dataset An HTML element with the following "data-" tags: extent, graphics, renderer, chart.
	 * @member {esri/geometry/Extent} extent
	 * @member {esri/Graphic[]} graphics
	 * @member {esri/renderer/SimpleRenderer} renderer
	 * @member {Object.<string, Object>} chart
	 * @member {AgeData} chart.age
	 * @member {LanguageData} chart.language
	 * @member {PovertyData} chart.poverty
	 * @member {VeteranData} chart.veteran
	 * @member {RaceData} chart.race
	 * @member {ArcGISDynamicMapServiceLaeyr} censusLayer
	 * @constructor
	 */
	function Parameters(dataset) {
		var layerInfo;

		this.extent = dataset.extent ? new Extent(JSON.parse(dataset.extent)) : null;
		this.aoiGraphics = dataset.aoiGraphics ? JSON.parse(dataset.aoiGraphics) : null;
		this.aoiRenderer = dataset.aoiRenderer ? new SimpleRenderer(JSON.parse(dataset.aoiRenderer)) : null;
		this.saGraphics = dataset.saGraphics ? JSON.parse(dataset.saGraphics) : null;
		this.saRenderer = dataset.saRenderer ? new SimpleRenderer(JSON.parse(dataset.saRenderer)) : null;
		this.chart = dataset.chart ? JSON.parse(dataset.chart, chartReviver) : null;
		layerInfo = dataset.censusLayer ? (JSON.parse(dataset.censusLayer)) : null;

		if (layerInfo) {
			var imageParameters = new ImageParameters();
			imageParameters.layerIds = layerInfo.visibleLayers;
			imageParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;
			this.censusLayer = new ArcGISDynamicMapServiceLayer(layerInfo.url, {
				imageParameters: imageParameters
			});
		} else {
			this.censusLayer = null;
		}
	}

	var dataElement = document.getElementById("data");
	
	// Either store the dataset element, or (if not supported by the browser) create a similar object.
	var dataset = dataElement.dataset || {
		extent: dataElement.getAttribute("data-extent") || null,
		aoiGraphics: dataElement.getAttribute("data-aoi-graphics") || null,
		aoiRenderer: dataElement.getAttribute("data-aoi-renderer") || null,
		saGraphics: dataElement.getAttribute("data-sa-graphics") || null,
		saRenderer: dataElement.getAttribute("data-sa-renderer") || null,
		chart: dataElement.getAttribute("data-chart") || null,
		layerInfo: dataElement.getAttribute("census-layer") || null
	};

	qsParameters = new Parameters(dataset);

	map = new Map("map", {
		basemap: "gray",
		extent: new Extent(qsParameters.extent),
		logo: false
	});

	map.on("load", function () {
		function createAndAddGraphicsLayer(renderer, graphics) {
			var layer = new GraphicsLayer();
			layer.setRenderer(renderer);
			graphics.forEach(function (graphic) {
				var g = new Graphic(graphic);
				layer.add(g);
			});
			map.addLayer(layer);
		}

		map.addLayer(qsParameters.censusLayer);
		createAndAddGraphicsLayer(qsParameters.saRenderer, qsParameters.saGraphics);
		createAndAddGraphicsLayer(qsParameters.aoiRenderer, qsParameters.aoiGraphics);
	});

	dataDiv = document.getElementById("data");

	dataDiv.appendChild(qsParameters.chart.language.toHtmlTable());
	dataDiv.appendChild(qsParameters.chart.race.toHtmlTable());
	dataDiv.appendChild(toHtmlTable(qsParameters.chart.age.combinedSubgrouped, AgeData.createLabelFromPropertyName, "Age", "Age"));
	dataDiv.appendChild(toHtmlTable(qsParameters.chart.poverty, function (name) {
		return name === "nonPoverty" ? "Non-poverty" : name === "federalTotalInPoverty" ? "Poverty (Federal)" : name;
	}, "Poverty", "Status", /(?:federalTotalInPoverty)|(?:nonPoverty)/));
	dataDiv.appendChild(toHtmlTable(qsParameters.chart.veteran, function (name) {
		var re = /^([MF])(Non)?(Vet)$/, match = name.match(re), output = name;
		if (match) {
			output = [];
			output.push(match[1] === "F" ? "Female" : "Male");
			if (match[2]) {
				output.push("Non-Vet.");
			} else {
				output.push("Vet.");
			}
			output = output.join(" ");
		}
		return output;

	}, "Veteran Status", "Group"));
});
