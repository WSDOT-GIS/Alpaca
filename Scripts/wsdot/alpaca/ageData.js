/*global define*/
define(function () {
	"use strict";

	var AgeData, AgeGroupedData, categoryNames;

	/** Adds spaces between words / numbers.
	 * @returns {string}
	 */
	function formatCategoryName(/**{string}*/ categoryName) {
		var output, re = /^([0-9]*?)([a-z]*)([0-9]+)$/i, match;
		if (categoryName) {
			match = categoryName.match(re);
			output = match.slice(1, 4).join(" ").trim();
		}
		return output || categoryName;
	}

	categoryNames = [
		"Under5",
		"5to9",
		"10to14",
		"15to17",
		"18to19",
		"20",
		"21",
		"22to24",
		"25to29",
		"30to34",
		"35to39",
		"40to44",
		"45to49",
		"50to54",
		"55to59",
		"60to61",
		"62to64",
		"65to66",
		"67to69",
		"70to74",
		"75to79",
		"80to84",
		"Over85"
	];

	/**
	 * @constructor
	 * @param {Object.<string, number>} queryResults
	 * @param {string} prefix Either "M" or "F"
	 * @member {number} "Under 5"
	 * @member {number} "5 to 9"
	 * @member {number} "10 to 14"
	 * @member {number} "15 to 17"
	 * @member {number} "18 to 19"
	 * @member {number} 20
	 * @member {number} 21
	 * @member {number} "22 to 24"
	 * @member {number} "25 to 29"
	 * @member {number} "30 to 34"
	 * @member {number} "35 to 39"
	 * @member {number} "40 to 44"
	 * @member {number} "45 to 49"
	 * @member {number} "50 to 54"
	 * @member {number} "55 to 59"
	 * @member {number} "60 to 61"
	 * @member {number} "62 to 64"
	 * @member {number} "65 to 66"
	 * @member {number} "67 to 69"
	 * @member {number} "70 to 74"
	 * @member {number} "75 to 79"
	 * @member {number} "80 to 84"
	 * @member {number} "Over 85"
	 */
	AgeGroupedData = function (queryResults, prefix) {
		var i, l, fieldName, cName, outName;

		if (prefix !== "M" && prefix !== "F") {
			throw new TypeError("Invalid prefix");
		}
		for (i = 0, l = categoryNames.length; i < l; i += 1) {
			// Add the prefix to get the field name.
			cName = categoryNames[i];
			outName = formatCategoryName(cName);
			fieldName = [prefix, cName].join("_");
			this[outName] = queryResults[fieldName] || queryResults["SUM_" + fieldName] || 0;
		}
	};

	AgeGroupedData.prototype.getTotal = function () {
		var propName, v, output = 0;
		for (propName in this) {
			if (this.hasOwnProperty(propName)) {
				v = this[propName];
				if (typeof v === "number") {
					output += v;
				}
			}
		}
		return output;
	};

	function getPercent(v, total) {
		var output;
		if (total) {
			output = Math.round((v / total) * 10000) / 100;
		}
		return output;
	}

	AgeGroupedData.prototype.toColumnChartSeries = function (/** {number} */ total, /** {string} */ color) {
		var output = [], item, v, propName;
		for (propName in this) {
			if (this.hasOwnProperty(propName)) {
				v = this[propName];
				if (typeof v === "number") {
					item = {
						y: v,
						text: propName,
						fill: color || null,
						stroke: "black",
						tooltip: total ? [propName, ": (~", getPercent(v, total), "%)"].join("") : [propName, ": ", v].join("")
					};

					output.push(item);
				}
			}

		}
		return output;
	};

	AgeData = function (queryResults) {
		/** @member {AgeGroupedData} */
		this.male = new AgeGroupedData(queryResults, "M");
		/** @member {AgeGroupedData} */
		this.female = new AgeGroupedData(queryResults, "F");
	};

	AgeData.prototype.getTotal = function () {
		return this.male.getTotal() + this.female.getTotal();
	};

	AgeData.AgeGroupedData = AgeGroupedData;

	/** Creates objects used to populate a column chart.
	 * @returns {Object[]}
	 */
	AgeData.prototype.toColumnChartSeries = function () {
		var output, total;

		total = this.getTotal();

		output = this.male.toColumnChartSeries(total, "blue").concat(this.female.toColumnChartSeries(total, "pink"));

		return output;
	};

	return AgeData;
});