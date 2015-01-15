/*global define*/
define(["dojo/number"], function (number) {
	/** @constructor */
	function DisabilityData(/**{Object.<string,number>}*/ queryResults) {
		/** @type {number} */
		this.hearingDisabled = queryResults.TotalHearingDisabled || 0;
		/** @type {number} */
		this.visualDisabled = queryResults.TotalVisualDisabled || 0;
		/** @type {number} */
		this.cognitiveDisabled = queryResults.TotalCognitiveDisabled || 0;
		/** @type {number} */
		this.ambulitoryDisabled = queryResults.TotalAmbulitoryDisabled || 0;
		/** @type {number} */
		this.selfCareDisabled = queryResults.TotalSelfCareDisabled || 0;
		/** @type {number} */
		this.independentLivingDisabled = queryResults.TotalIndependentLivingDisabled || 0;
		/** @type {number} */
		this.totalPopulation = queryResults.Total_DIS || 0;
	}

	DisabilityData.labels = {
		hearingDisabled: "hearingDisabled",
		visualDisabled: "visualDisabled",
		cognitiveDisabled: "cognitiveDisabled",
		ambulitoryDisabled: "ambulitoryDisabled",
		selfCareDisabled: "selfCareDisabled",
		independentLivingDisabled: "independentLivingDisabled"
	};

	/**
	 * Gets the total number of disabled by combining the numbers in the specific categories.
	 * @returns {number}
	 */
	DisabilityData.prototype.getTotalDisabled = function () {
		return this.hearingDisabled
			+ this.visualDisabled
			+ this.cognitiveDisabled
			+ this.ambulitoryDisabled
			+ this.selfCareDisabled
			+ this.independentLivingDisabled;
	};

	/** Creates objects used to populate a column chart.
	 * @param {string} level - "statewide", "service area", or "aoi". Used to determine bar chart outline color.
	 * @param {bool} background - Set to true if the chart series will be behind another chart, false otherwise. If true the chart fill color will be less saturated than it would be otherwise.
	 * @returns {ChartSeries[]}
	 */
	DisabilityData.prototype.toColumnChartSeries = function (level, background) {
		var category, output = [], item, label, percent, total, categoryCount, aoiRe = /aoi/i, normalFill, thresholdFill;
		thresholdFill = "#FF0000";
		normalFill = "#FFBEBE";

		total = this.getTotal();
		for (category in DisabilityData.labels) {
			if (DisabilityData.labels.hasOwnProperty(category)) {
				label = DisabilityData.labels[category];
				categoryCount = this[category];
				percent = Math.round((categoryCount / total) * 10000) / 100;
				item = {
					y: categoryCount,
					text: label,
					// If the level is "AOI", set stroke color to blue if background is true, green if false.
					// If level is not "AOI", set stroke color to black.
					stroke: {
						color: aoiRe.test(level) ? (background ? "blue" : "green") : "black",
						width: aoiRe.test(level) ? 3 : 1
					},
					// Set the fill depending if the threshold has been met and if background is true.
					fill: this.thresholdMet(category) ? thresholdFill : normalFill,
					// Set the tooltip to display the category, number of speakers, and the percentage of those speakers vs. total.
					tooltip: [label, ": ", number.format(categoryCount), "(~", percent, "%)"].join("")
				};
				output.push(item);
			}
		}
		return output;
	};

	/** Generates an HTML Table of the language data.
	 * @returns {HTMLTableElement}
	 */
	DisabilityData.prototype.toHtmlTable = function () {
		var self = this, table, tbody, total, propertyName;

		total = this.getTotal();

		table = document.createElement("table");
		table.createCaption().textContent = "Disability";
		table.createTHead().innerHTML = "<tr><th>Type</th><th>Count</th><th>%</th></tr>";
		tbody = document.createElement("tbody");
		table.appendChild(tbody);

		/** Adds a row of data to the innerHTML array.
		*/
		function addRow(/**{string} */ propertyName) {
			var tr, td, label, value, percent;

			label = DisabilityData.labels[propertyName];
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
			td.textContent = [number.format(percent, { places: 2 }), "%"].join("");
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

	return DisabilityData;
});