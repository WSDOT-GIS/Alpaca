/*global define*/
/*jslint nomen:true,plusplus:true*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/tasks/StatisticDefinition",
	"dojo/number",
	"title6/utils"
], function (declare, Evented, Query, QueryTask, StatisticDefinition, number, utils) {
	"use strict";
	var ChartDataProvider;



	function RaceData(/**{Object}*/ queryResults) {
		this.white = queryResults.SUM_White;
		this.minority = queryResults.SUM_NotWhite;
		this.oneRace = queryResults.SUM_OneRace;
		this.marginOfError = {
			white: queryResults.MAX_MEWhite,
			oneRace: queryResults.MAX_MEOneRace,
			total: queryResults.MAX_METotal
		};
	}

	RaceData.labels = {
		white: "White",
		minority: "Minority"
	};

	RaceData.prototype.getTotal = function () {
		return this.white + this.minority;
	};

	RaceData.prototype.toPieChartSeries = function () {
		var race, item, output = [], total, label;

		total = this.getTotal();

		for (race in RaceData.labels) {
			if (RaceData.labels.hasOwnProperty(race)) {
				label = RaceData.labels[race];
				item = {
					y: this[race],
					text: label,
					fill: race === "white" ? "RGB(255,235,204)" : "RGB(240,118,5)",
					stroke: "black",
					tooltip: [label, ": (~", Math.round((this[race] / total) * 10000) / 100, "%)"].join("")
				};
				output.push(item);
			}
		}

		return output;
	};

	function LanguageData(/**{Object}*/ queryResults) {
		this.english = queryResults.SUM_English;
		this.spanish = queryResults.SUM_Spanish;
		this.indoEuropean = queryResults.SUM_Indo_European;
		this.asianPacificIsland = queryResults.SUM_Asian_PacificIsland;
		this.other = queryResults.SUM_Other;
	}

	LanguageData.labels = {
		english: "English",
		spanish: "Spanish",
		indoEuropean: "Indo / European",
		asianPacificIsland: "Asian / Pacific Island",
		other: "Other"
	};

	/** Returns the total number of people.
	 * @returns {Number}
	 */
	LanguageData.prototype.getTotal = function () {
		return this.english + this.spanish + this.indoEuropean + this.asianPacificIsland + this.other;
	};

	/** Returns the number of people in the largest non-English group.
	 * @returns {Number}
	 */
	LanguageData.prototype.getMaxNotEnglish = function () {
		return Math.max(this.spanish, this.indoEuropean, this.asianPacificIsland, this.other);
	};

	/** Returns the zoom scale integer for DojoX chart zooming to make non-English columns visible in the chart.
	 * @returns {Number}
	 */
	LanguageData.prototype.getNotEnglishZoomScale = function () {
		return this.getTotal() / this.getMaxNotEnglish() - 10;
	};

	/** Determines if the threshold has been met for a particular language.
	 * @param {String} language The name of one of the language properties: "english", "spanish", "indoEuropean", "asianPacificIsland", "other".
	 * @returns {Boolean} If language is "english" or an invalid property name, false will be returned. Returns true if the number of speakers of the language is greater than 1000 or is greater than 5% of the total population.
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


	function ChartData(/**{Object}*/ queryResults) {
		this.race = new RaceData(queryResults);
		this.language = new LanguageData(queryResults);
	}

	function createStatisticDefinitions() {
		var i, l, statDef, output;

		output = [
			{ "statisticType": "sum", "onStatisticField": "White" },
			{ "statisticType": "sum", "onStatisticField": "NotWhite" },
			{ "statisticType": "sum", "onStatisticField": "OneRace" },

			{ "statisticType": "max", "onStatisticField": "MEWhite" },
			{ "statisticType": "max", "onStatisticField": "MEOneRace" },
			{ "statisticType": "max", "onStatisticField": "METotal" },


			{ "statisticType": "sum", "onStatisticField": "English" },
			{ "statisticType": "sum", "onStatisticField": "Spanish" },
			{ "statisticType": "sum", "onStatisticField": "Indo_European" },
			{ "statisticType": "sum", "onStatisticField": "Asian_PacificIsland" },
			{ "statisticType": "sum", "onStatisticField": "Other" }
		];

		for (i = 0, l = output.length; i < l; i += 1) {
			statDef = new StatisticDefinition();
			statDef.onStatisticField = output[i].onStatisticField;
			statDef.statisticType = output[i].statisticType;
			output[i] = statDef;
		}

		return output;
	}

	ChartDataProvider = declare(Evented, {

		_statisticDefinitions: createStatisticDefinitions(),
		/** The query tasks for each zoom level: blockGroup, tract, and county.
		 */
		queryTasks: {
			blockGroup: null,
			tract: null,
			county: null
		},
		/** Returns a query task appropriate for the scale: county, tract, or block group.
		 * @param {Number} scale
		 * @returns {esri/tasks/QueryTask}
		 */
		getQueryTaskForScale: function (scale) {
			var qt, levelName;
			levelName = utils.getLevel(scale);
			qt = this.queryTasks[levelName];
			return qt;
		},
		/** Trigger the chart update events.
		 * @param {esri/geometry/Geometry} [geometry]
		 * @param {Number} [scale]
		 * @returns {dojo/Deferred} Returns the output of the query tasks execute function.
		 */
		updateCharts: function (geometry, scale) {
			var self = this, query, queryTask;
			query = new Query();
			query.outStatistics = this._statisticDefinitions;
			if (geometry) {
				query.geometry = geometry;
			}
			queryTask = this.getQueryTaskForScale(scale);
			return queryTask.execute(query, function (/** {FeatureSet}*/ featureSet) {
				var results, output;
				results = featureSet.features[0].attributes;
				output = {
					geometry: geometry || null,
					chartData: new ChartData(results)
				};
				self.emit("query-complete", output);
			}, function (/** {Error} */error) {
				self.emit("query-error", {
					query: query,
					error: error
				});
			});
		},
		/**
		 * @param {String} mapServiceUrl
		 * @param {Object} options
		 * @param {Number} options.blockGroupLayerId
		 * @param {Number} options.tractLayerId
		 * @param {Number} options.countyLayerId
		 */
		constructor: function (mapServiceUrl, options) {
			if (!mapServiceUrl) {
				throw new TypeError("The map service URL was not provided.");
			}

			// Create the options if not provided.
			if (!options) {
				options = {
					blockGroupLayerId: 0,
					tractLayerId: 1,
					countyLayerId: 2
				};
			}

			// Append a trailing slash to the URL if it does not already have one.
			if (!/\/$/.test(mapServiceUrl)) {
				mapServiceUrl += "/";
			}
			// Create the query tasks.
			this.queryTasks.blockGroup = new QueryTask(mapServiceUrl + String(options.blockGroupLayerId));
			this.queryTasks.tract = new QueryTask(mapServiceUrl + String(options.tractLayerId));
			this.queryTasks.county = new QueryTask(mapServiceUrl + String(options.countyLayerId));

			this.updateCharts();
		}
	});

	return ChartDataProvider;
});