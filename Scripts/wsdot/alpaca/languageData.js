/*global define*/
/*jslint nomen:true,plusplus:true,browser:true,white:true*/
define(["dojo/number"], function (number) {
	"use strict";

	/** @constructor */
	function LanguageData(/**{Object.<string,number>}*/ queryResults) {
		/** @type {number} */
		this.english = queryResults.english || queryResults.English || queryResults.SUM_English || queryResults.TotalEnglish || 0;
		/** @type {number} */
		this.spanish = queryResults.spanish || queryResults.Spanish || queryResults.SUM_Spanish || queryResults.TotalSpanish || 0;
		/** @type {number} */
		this.indoEuropean = queryResults.indoEuropean || queryResults.Indo_European || queryResults.SUM_Indo_European || queryResults.TotalIndoEuropean || 0;
		/** @type {number} */
		this.asianPacificIsland = queryResults.asianPacificIsland || queryResults.Asian_PacificIsland || queryResults.SUM_Asian_PacificIsland || queryResults.TotalAsianPacificIsland || 0;
		/** @type {number} */
		this.other = queryResults.other || queryResults.Other || queryResults.SUM_Other || queryResults.TotalOther || 0;
	}

	/** Provides labels for each of the LanguageData properties.
	 * @static {Object.<string, number>}
	 */
	LanguageData.labels = {
		english: "English",
		spanish: "Spanish",
		indoEuropean: "Indo / European",
		asianPacificIsland: "Asian / Pacific Island",
		other: "Other"
	};

	/** Returns the total number of people.
	 * @returns {number}
	 */
	LanguageData.prototype.getTotal = function () {
		return this.english + this.spanish + this.indoEuropean + this.asianPacificIsland + this.other;
	};

	/** Returns the number of people in the largest non-English group.
	 * @returns {number}
	 */
	LanguageData.prototype.getMaxNotEnglish = function () {
		return Math.max(this.spanish, this.indoEuropean, this.asianPacificIsland, this.other);
	};

	/** Returns the zoom scale integer for DojoX chart zooming to make non-English columns visible in the chart.
	 * @returns {number}
	 */
	LanguageData.prototype.getNotEnglishZoomScale = function () {
		var output;
		output = this.getTotal() / this.getMaxNotEnglish() - 10;
		if (output < 0) {
			output = 0;
		}
		return output;
	};

	/** Determines if the threshold has been met for a particular language.
	 * @param {string} language The name of one of the language properties: "english", "spanish", "indoEuropean", "asianPacificIsland", "other".
	 * @returns {boolean} If language is "english" or an invalid property name, false will be returned. Returns true if the number of speakers of the language is greater than 1000 or is greater than 5% of the total population.
	 */
	LanguageData.prototype.thresholdMet = function (language) {
		var total, thresholdMet = false, speakerCount;
		// Get the total number of people.
		if (this.hasOwnProperty(language) && language !== "english") {
			total = this.english + this.spanish + this.indoEuropean + this.asianPacificIsland + this.other;
			speakerCount = this[language];
			if (speakerCount > 1000 || speakerCount / total > 0.05) {
				thresholdMet = true;
			}
		}
		return thresholdMet;
	};

	/** @typedef ChartSeries
	 * @param {number} y - The value represented in the chart.
	 * @param {string} text - The label of the chart series.
	 * @param {string} stroke - The stroke color.
	 * @param {string} fill - The fill color.
	 * @param {string} tooltip - The text that will appear when the mouse cursor hovers over a bar in the chart.
	 */

	/** Creates objects used to populate a column chart.
	 * @param {string} level - "statewide", "service area", or "aoi". Used to determine bar chart outline color.
	 * @param {bool} background - Set to true if the chart series will be behind another chart, false otherwise. If true the chart fill color will be less saturated than it would be otherwise.
	 * @returns {ChartSeries[]}
	 */
	LanguageData.prototype.toColumnChartSeries = function (level, background) {
		var language, output = [], item, label, percent, total, speakerCount, aoiRe = /aoi/i, normalFill, thresholdFill;
		thresholdFill = "#FF0000";
		normalFill = "#FFBEBE";
		
		total = this.getTotal();
		for (language in LanguageData.labels) {
			if (LanguageData.labels.hasOwnProperty(language)) {
				label = LanguageData.labels[language];
				speakerCount = this[language];
				percent = Math.round((speakerCount / total) * 10000) / 100;
				item = {
					y: speakerCount,
					text: label,
					// If the level is "AOI", set stroke color to blue if background is true, green if false.
					// If level is not "AOI", set stroke color to black.
					stroke: {
						color: aoiRe.test(level) ? (background ? "blue" : "green") : "black",
						width: aoiRe.test(level) ? 3 : 1
					},
					// Set the fill depending if the threshold has been met and if background is true.
					fill: this.thresholdMet(language) ? thresholdFill : normalFill,
					// Set the tooltip to display the language, number of speakers, and the percentage of those speakers vs. total.
					tooltip: [label, ": ", number.format(speakerCount), "(~", percent, "%)"].join("")
				};
				output.push(item);
			}
		}
		return output;
	};

	/** Generates an HTML Table of the language data.
	 * @returns {HTMLTableElement}
	 */
	LanguageData.prototype.toHtmlTable = function () {
		var self = this, table, tbody, total, propertyName;

		total = this.getTotal();

		table = document.createElement("table");
		table.createCaption().textContent = "Language Proficiency";
		table.createTHead().innerHTML = "<tr><th>Language</th><th>Count</th><th>%</th></tr>";
		tbody = document.createElement("tbody");
		table.appendChild(tbody);

		/** Adds a row of data to the innerHTML array.
		*/
		function addRow(/**{string} */ propertyName) {
			var tr, td, label, value, percent;

			label = LanguageData.labels[propertyName];
			value = self[propertyName];
			percent = (value / total) * 100;

			tr = document.createElement("tr");
			if (self.thresholdMet(propertyName)) {
				tr.classList.add("threshold-met");
			}

			td = document.createElement("td");
			td.textContent = label;
			tr.appendChild(td);

			td = document.createElement("td");
			td.textContent = number.format(value);
			tr.appendChild(td);

			td = document.createElement("td");
			td.textContent = [number.format(percent, {places: 2}), "%"].join("");
			tr.appendChild(td);

			tbody.appendChild(tr);
		}

		for (propertyName in self) {
			if (self.hasOwnProperty(propertyName)) {
				addRow(propertyName);
			}
		}

		return table;
	};

	return LanguageData;
});