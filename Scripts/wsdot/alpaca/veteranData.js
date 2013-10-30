/*global define*/

define(function () {

	/**
	 * @constructor
	 */
	function VeteranData(queryResults) {
		/** @member {number} */
		this.Veteran = queryResults.Veteran || 0;
		/** @member {number} */
		this.NonVeteran = queryResults.NonVeteran || 0;
	}

	/** Returns the combined number of Veterans and Non-Veterans.
	 * @returns {number}
	 */
	VeteranData.prototype.getTotal = function () {
		return this.Veteran + this.NonVeteran;
	}
	
	function getPercent(n, total) {
		return Math.round((n / total) * 10000) / 100;
	}

	/** 
	 * @typedef ColumnChartSeriesItem
	 * @property {number} y - The y value.
	 * @property {string} text - The label.
	 * @property {string} stroke - The color of the outline.
	 * @property {string} fill - The fill color.
	 * @property {stirng} tooltip - The string used for the tooltip.
	 */


	/** Creates objects used to populate a column chart.
	 * @returns {ColumnChartSeriesItem[]}
	 */
	VeteranData.prototype.toColumnChartSeries = function () {
		var output = [];
		total = this.getTotal();


		output.push([{
			y: this.Veteran,
			text: "Veteran",
			stroke: "black",
			fill: "green",
			tooltip: [Veteran, ": ", number.format(this.Veteran), "(~", getPercent(this.Veteran, total), "%)"].join("")
		}, {
			y: this.NonVeteran,
			text: "Non-Veteran",
			stroke: "black",
			fill: "gray",
			tooltip: [NonVeteran, ": ", number.format(this.NonVeteran), "(~", getPercent(this.NonVeteran, total), "%)"].join("")
		}]);

		return output;
	};

	return VeteranData;
});