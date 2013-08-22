/*global define*/
/*jslint nomen:true,plusplus:true,browser:true,white:true*/
define(["dojo/number"], function (number) {
	"use strict";

	/** @constructor */
	function LanguageData(/**{Object.<string,number>}*/ queryResults) {
		/** @type {number} */
		this.english = queryResults.english || queryResults.SUM_English || 0;
		/** @type {number} */
		this.spanish = queryResults.spanish || queryResults.SUM_Spanish || 0;
		/** @type {number} */
		this.indoEuropean = queryResults.indoEuropean || queryResults.SUM_Indo_European || 0;
		/** @type {number} */
		this.asianPacificIsland = queryResults.asianPacificIsland || queryResults.SUM_Asian_PacificIsland || 0;
		/** @type {number} */
		this.other = queryResults.other || queryResults.SUM_Other || 0;
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
		return this.getTotal() / this.getMaxNotEnglish() - 10;
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

	/** Creates objects used to populate a column chart.
	 * @returns {Array}
	 */
	LanguageData.prototype.toColumnChartSeries = function () {
		var language, output = [], item, label, percent, total, speakerCount;
		total = this.getTotal();
		for (language in LanguageData.labels) {
			if (LanguageData.labels.hasOwnProperty(language)) {
				label = LanguageData.labels[language];
				speakerCount = this[language];
				percent = Math.round((speakerCount / total) * 10000) / 100;
				item = {
					y: speakerCount,
					text: label,
					stroke: "black",
					fill: this.thresholdMet(language) ? "#FF0000" : "#FFBEBE",
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
			percent = Math.round((value / total) * 10000) / 100;

			tr = document.createElement("tr");
			if (self.thresholdMet(propertyName)) {
				tr.classList.add("threshold-met");
			}

			td = document.createElement("td");
			td.textContent = label;
			tr.appendChild(td);

			td = document.createElement("td");
			td.textContent = value;
			tr.appendChild(td);

			td = document.createElement("td");
			td.textContent = [percent, "%"].join("");
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