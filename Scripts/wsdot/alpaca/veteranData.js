/*global define*/

define(function () {
	var fieldRegExp;

	fieldRegExp =  /^([MF])(Non)?Vet$/i // /^[MF](Age[0-9]{1,2})?([a-z]+)?[0-9]+(?:Non)?Vet$/i;

	/**
	 * @constructor
	 */
	function VeteranData(queryResults) {
		/** @member {number} */
		this.MVet = queryResults.MVet || 0;
		/** @member {number} */
		this.MNonVet = queryResults.MNonVet || 0;
		/** @member {number} */
		this.FVet = queryResults.FVet || 0;
		/** @member {number} */
		this.FNonVet = queryResults.FNonVet || 0;
	}

	/** Returns the combined number of veterans and non-veterans, both male and female.
	 * @returns {number}
	 */
	VeteranData.prototype.getTotal = function () {
		return this.MVet + this.FVet + this.MNonVet + this.FNonVet;
	}

	/** Returns the combined number of veterans, both male and female.
	 * @returns {number}
	 */
	VeteranData.prototype.getTotalVet = function () {
		return this.MVet + this.FVet;
	}

	/** Returns the combined number of non-veterans, both male and female.
	 * @returns {number}
	 */
	VeteranData.prototype.getTotalNonVet = function () {
		return this.MNonVet + this.FNonVet;
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

	/** @static {RegExp} */
	VeteranData.fieldRegExp = fieldRegExp;

	return VeteranData;
});