﻿/*global define */
define(["dojo/number"], function (number) {
	"use strict";

	/**
	 * @constructor
	 */
	function PovertyData(queryResults) {
		/** @member {number} */
		this.totalPopulation = queryResults.Total_POV || 0;
		/** @member {number} */
		this.federalTotalInPoverty = queryResults.Poverty_Fed || 0;
		/////** @member {number} */
		////this.stateTotalInPoverty = queryResults.Poverty_State || 0;

		this.nonPoverty = (this.totalPopulation - this.federalTotalInPoverty) || 0;

		/** @member {number} */
		this.medianIncome = queryResults.Income || 0;
	}

	/**
	 * @returns {number}
	 */
	PovertyData.prototype.getPercentInPovertyForState = function () {
		return (this.stateTotalInPoverty / this.totalPopulation) * 100;
	};

	/**
	 * @returns {number}
	 */
	PovertyData.prototype.getPercentInPovertyForFederal = function () {
		return (this.federalTotalInPoverty / this.totalPopulation) * 100;
	};


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
	PovertyData.prototype.toChartSeries = function () {
		var output, pctInPoverty;

		pctInPoverty = Math.round(this.getPercentInPovertyForFederal());

		output = [
			{
				y: this.federalTotalInPoverty,
				text: "Poverty",
				stroke: "black",
				fill: "RGB(87,145,101)",
				tooltip: ["Poverty: ", number.format(this.federalInPoverty), "(~", pctInPoverty, "%)"].join("")
			}, {
				y: this.nonPoverty,
				text: "Non-Poverty",
				stroke: "black",
				fill: "RGB(220,245,233)",
				tooltip: ["Non-Poverty: ", number.format(this.nonPoverty), "(~", 100 - pctInPoverty, "%)"].join("")
			}
		];

		return output;
	};

	return PovertyData;
});