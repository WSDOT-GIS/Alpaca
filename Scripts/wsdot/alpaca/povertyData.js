/** 
*/
define(function () {
	"use strict";

	/**
	 * @constructor
	 */
	function PovertyData(queryResults) {
		/** @member {number} */
		this.TotalPopulation = queryResults.Total_POV || 0;
		/** @member {number} */
		this.FederalTotalInPoverty = queryResults.Poverty_Fed || 0;
		/** @member {number} */
		this.StateTotalInPoverty = queryResults.Poverty_State || 0;
	}

	/**
	 * @returns {number}
	 */
	PovertyData.prototype.getPercentInPovertyForState = function () {
		return (this.StateTotalInPoverty / this.TotalPopulation) * 100;
	};

	/**
	 * @returns {number}
	 */
	PovertyData.prototype.getPercentInPovertyForFederal = function () {
		return (this.FederalTotalInPoverty / this.TotalPopulation) * 100;
	};

	return PovertyData;
});