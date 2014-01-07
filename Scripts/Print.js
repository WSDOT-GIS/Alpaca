/*global require*/
/*jslint white:true,browser:true*/
require([
	"dojo/number",
	"esri/map",
	"esri/geometry/Extent",
	"esri/graphic",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"alpaca/ageData",
	"alpaca/languageData",
	"alpaca/povertyData",
	"alpaca/raceData",
	"alpaca/veteranData"
], function (number, Map, Extent, Graphic, GraphicsLayer, SimpleRenderer, AgeData, LanguageData, PovertyData, RaceData, VeteranData) {
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
	 * @param {Regexp} propertiesToInclue
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

		for (var propName in o) {
			if (o.hasOwnProperty(propName) && (propertiesToInclude ? propertiesToInclude.test(propName) : true)) {
				addRow(propName);
			}
		}

		thead = table.createTHead();
		thead.innerHTML = ["<tr><th>", propertyHeader || caption || "", "</th><th>Count</th><th>%</th></tr>"].join("");
		table.createTBody();

		return table;
	}

	/** Reads information from the data tags of an HTML element.
	 * @param {HTMLElement} An HTML element with the following "data-" tags: extent, graphics, renderer, chart.
	 * @member {esri/geometry/Extent} extent
	 * @member {esri/Graphic[]} graphics
	 * @member {esri/renderer/SimpleRenderer} renderer
	 * @member {Object} chart
	 * @member {LanguageData} chart.language
	 * @member {RaceData} chart.race
	 * @constructor
	 */
	function Parameters(dataset) {
		this.extent = dataset.extent ? new Extent(JSON.parse(dataset.extent)) : null;
		this.graphics = dataset.graphics ? JSON.parse(dataset.graphics) : null;
		this.renderer = dataset.renderer ? new SimpleRenderer(JSON.parse(dataset.renderer)) : null;

		this.chart = dataset.chart ? JSON.parse(dataset.chart) : null;

		if (this.chart) {
			//if (this.chart.age) {
			//	this.chart.age = new AgeData(this.chart.age);
			//}
			if (this.chart.language) {
				this.chart.language = new LanguageData(this.chart.language);
			}
			if (this.chart.poverty) {
				this.chart.poverty = new PovertyData(this.chart.poverty);
			}
			if (this.chart.veteran) {
				this.chart.veteran = new VeteranData(this.chart.veteran);
			}
			if (this.chart.race) {
				this.chart.race = new RaceData(this.chart.race);
			}
			// age, language, poverty, race, veteran
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

