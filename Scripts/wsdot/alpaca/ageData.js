define(function () {
	"use strict";

	var AgeData, SingleGenderAgeData, categoryNames;


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
	 * @member {number} Under5
	 * @member {number} 5to9
	 * @member {number} 10to14
	 * @member {number} 15to17
	 * @member {number} 18to19
	 * @member {number} 20
	 * @member {number} 21
	 * @member {number} 22to24
	 * @member {number} 25to29
	 * @member {number} 30to34
	 * @member {number} 35to39
	 * @member {number} 40to44
	 * @member {number} 45to49
	 * @member {number} 50to54
	 * @member {number} 55to59
	 * @member {number} 60to61
	 * @member {number} 62to64
	 * @member {number} 65to66
	 * @member {number} 67to69
	 * @member {number} 70to74
	 * @member {number} 75to79
	 * @member {number} 80to84
	 * @member {number} Over85
	 */
	SingleGenderAgeData = function (queryResults, prefix) {
		var i, l, fieldName, cName;
		if (prefix !== "M" && prefix !== "F") {
			throw new TypeError("Invalid prefix")
		}
		for (i = 0, l = categoryNames.length; i < l; i += 1) {
			// Add the prefix to get the field name.
			cName = categoryNames[i];
			fieldName = [prefix, cName].join("_");
			this[cName] = queryResults[fieldName] || queryResults["SUM_" + fieldName] || 0;
		}
	}

	AgeData = function (queryResults) {
		/** @member {SingleGenderAgeData} */
		this.male = new SingleGenderAgeData(queryResults, "M");
		/** @member {SingleGenderAgeData} */
		this.female = new SingleGenderAgeData(queryResults, "F");
	}

	AgeData.SingleGenderAgeData = SingleGenderAgeData;

	return AgeData;
});