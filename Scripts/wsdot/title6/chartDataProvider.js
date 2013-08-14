﻿/*global define*/
/*jslint nomen:true,plusplus:true*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/tasks/StatisticDefinition",
	"dojo/number"
], function (declare, Evented, Query, QueryTask, StatisticDefinition, number) {
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

	LanguageData.prototype.getTotal = function () {
		return this.english + this.spanish + this.indoEuropean + this.asianPacificIsland + this.other;
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
		languageLayerInfo: null,
		minorityLayerInfo: null,
		/** Trigger the chart update events.
		*/
		selectedGeometry: null,
		_statisticDefinitions: createStatisticDefinitions(),
		updateCharts: function (/** {esri/geometry/Geometry} */ geometry) {
			var self = this, query;
			query = new Query();
			query.outStatistics = this._statisticDefinitions;
			if (geometry) {
				query.geometry = geometry;
				query.spatialRelationship = Query.SPATIAL_REL_CROSSES;
			}
			return this.queryTask.execute(query, function (/** {FeatureSet}*/ featureSet) {
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
		queryTask: null,
		/**
		@param {String} queryTaskUrl
		*/
		constructor: function (queryTaskUrl) {
			if (!queryTaskUrl) {
				throw new TypeError("The Query Task URL was not provided.");
			}

			this.queryTask = new QueryTask(queryTaskUrl);
			this.updateCharts();
		}
	});

	return ChartDataProvider;
});