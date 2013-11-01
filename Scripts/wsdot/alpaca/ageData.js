/*global define*/
define(function () {
	"use strict";

	var AgeData, AgeGroupedData;

	/**
	 * @constructor
	 * @param {Object.<string,number>} queryResults
	 * @param {string] [prefix] - If provided, valid values are "M" or "F".
	 * @member {number} ageUnder5 - Number of people in the age range Under5
	 * @member {number} age5to9 - Number of people in the age range 5to9
	 * @member {number} age10to14 - Number of people in the age range 10to14
	 * @member {number} age15to17 - Number of people in the age range 15to17
	 * @member {number} age18to19 - Number of people in the age range 18to19
	 * @member {number} age20 - Number of people in the age range 20
	 * @member {number} age21 - Number of people in the age range 21
	 * @member {number} age22to24 - Number of people in the age range 22to24
	 * @member {number} age25to29 - Number of people in the age range 25to29
	 * @member {number} age30to34 - Number of people in the age range 30to34
	 * @member {number} age35to39 - Number of people in the age range 35to39
	 * @member {number} age40to44 - Number of people in the age range 40to44
	 * @member {number} age45to49 - Number of people in the age range 45to49
	 * @member {number} age50to54 - Number of people in the age range 50to54
	 * @member {number} age55to59 - Number of people in the age range 55to59
	 * @member {number} age60to61 - Number of people in the age range 60to61
	 * @member {number} age62to64 - Number of people in the age range 62to64
	 * @member {number} age65to66 - Number of people in the age range 65to66
	 * @member {number} age67to69 - Number of people in the age range 67to69
	 * @member {number} age70to74 - Number of people in the age range 70to74
	 * @member {number} age75to79 - Number of people in the age range 75to79
	 * @member {number} age80to84 - Number of people in the age range 80to84
	 * @member {number} ageOver85 - Number of people in the age range Over85
	 */
	AgeGroupedData = function (queryResults, prefix) {
		this.ageUnder5 = queryResults[ prefix ? prefix + "_Under5" : "ageUnder5"] || 0;
		this.age5to9 = queryResults[ prefix ? prefix + "_5to9" : "age5to9"] || 0;
		this.age10to14 = queryResults[ prefix ? prefix + "_10to14" : "age10to14"] || 0;
		this.age15to17 = queryResults[ prefix ? prefix + "_15to17" : "age15to17"] || 0;
		this.age18to19 = queryResults[ prefix ? prefix + "_18to19" : "age18to19"] || 0;
		this.age20 = queryResults[ prefix ? prefix + "_20" : "age20"] || 0;
		this.age21 = queryResults[ prefix ? prefix + "_21" : "age21"] || 0;
		this.age22to24 = queryResults[ prefix ? prefix + "_22to24" : "age22to24"] || 0;
		this.age25to29 = queryResults[ prefix ? prefix + "_25to29" : "age25to29"] || 0;
		this.age30to34 = queryResults[ prefix ? prefix + "_30to34" : "age30to34"] || 0;
		this.age35to39 = queryResults[ prefix ? prefix + "_35to39" : "age35to39"] || 0;
		this.age40to44 = queryResults[ prefix ? prefix + "_40to44" : "age40to44"] || 0;
		this.age45to49 = queryResults[ prefix ? prefix + "_45to49" : "age45to49"] || 0;
		this.age50to54 = queryResults[ prefix ? prefix + "_50to54" : "age50to54"] || 0;
		this.age55to59 = queryResults[ prefix ? prefix + "_55to59" : "age55to59"] || 0;
		this.age60to61 = queryResults[ prefix ? prefix + "_60to61" : "age60to61"] || 0;
		this.age62to64 = queryResults[ prefix ? prefix + "_62to64" : "age62to64"] || 0;
		this.age65to66 = queryResults[ prefix ? prefix + "_65to66" : "age65to66"] || 0;
		this.age67to69 = queryResults[ prefix ? prefix + "_67to69" : "age67to69"] || 0;
		this.age70to74 = queryResults[ prefix ? prefix + "_70to74" : "age70to74"] || 0;
		this.age75to79 = queryResults[ prefix ? prefix + "_75to79" : "age75to79"] || 0;
		this.age80to84 = queryResults[ prefix ? prefix + "_80to84" : "age80to84"] || 0;
		this.ageOver85 = queryResults[ prefix ? prefix + "_Over85" : "ageOver85"] || 0;
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

	/** 
	 * @member {AgeGroupedData} male
	 * @member {AgeGroupedData} female
	 * @member {AgeGroupedData} combined - combined male and female age data.
	*/
	AgeData = function (queryResults) {
		this.male = new AgeGroupedData(queryResults, "M");
		this.female = new AgeGroupedData(queryResults, "F");

		this.combined = {};

		for (var propName in this.male) {
			if (this.male.hasOwnProperty(propName) && this.female.hasOwnProperty(propName)) {
				this.combined[propName] = this.male[propName] + this.female[propName];
			}
		}

		this.combined = new AgeGroupedData(this.combined);
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

		output = this.combined.toColumnChartSeries(total, "hsl(240,100%, 50%)"); // this.male.toColumnChartSeries(total, "blue").concat(this.female.toColumnChartSeries(total, "pink"));

		return output;
	};

	return AgeData;
});