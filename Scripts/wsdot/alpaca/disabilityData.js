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
		hearingDisabled: "Hearing Disabled",
		visualDisabled: "Visual Disabled",
		cognitiveDisabled: "Cognitive Disabled",
		ambulitoryDisabled: "Ambulatory Disabled",
		selfCareDisabled: "Self Care Disabled",
		independentLivingDisabled: "Independent Living Disabled"
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
	 * @returns {Object[]}
	 */
	DisabilityData.prototype.toColumnChartSeries = function (level, isBackground) {
		var disability, item, output = [], total, label;

		total = this.getTotalDisabled();

		var strokeColor = "black";
		var strokeWidth = 1;
		if (level === "aoi") {
			strokeColor = isBackground ? "blue" : "green";
			strokeWidth = 3;
		}

		for (disability in DisabilityData.labels) {
			if (DisabilityData.labels.hasOwnProperty(disability)) {
				label = DisabilityData.labels[disability];
				item = {
					y: this[disability],
					text: label,
					fill: "RGB(240,118,5)",
					tooltip: [label, ": ", number.format(this[disability]), " (~", Math.round((this[disability] / total) * 10000) / 100, "%)"].join(""),
					stroke: {
						color: strokeColor,
						width: strokeWidth
					}
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

		total = this.getTotalDisabled();

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
			////if (self.thresholdMet(propertyName)) {
			////	tr.classList.add("threshold-met");
			////}

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