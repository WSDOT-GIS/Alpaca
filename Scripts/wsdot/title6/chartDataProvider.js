/*global define*/
/*jslint nomen:true,plusplus:true*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/tasks/StatisticDefinition",
	"title6/raceData",
	"title6/languageData",
	"title6/utils"
], function (declare, Evented, Query, QueryTask, StatisticDefinition, RaceData, LanguageData, utils) {
	/** Provides classes for updating charts.
	 * @exports wsdot/title6/chartDataProvider
	 */
	"use strict";
	var ChartDataProvider;

	/**
	 * @constructor
	 */
	function ChartData(/**{Object}*/ queryResults) {
		/** Provices race data */
		this.race = new RaceData(queryResults);
		/** Provides language data */
		this.language = new LanguageData(queryResults);
	}

	/** Creates an array of statistic definition objects
	 * @returns {esri/tasks/StatisticDefinition}
	 */
	function createStatisticDefinitions() {
		var i, l, statDef, output;

		output = [
			{ "statisticType": "sum", "onStatisticField": "White" },
			{ "statisticType": "sum", "onStatisticField": "NotWhite" },
			{ "statisticType": "sum", "onStatisticField": "OneRace" },

			////{ "statisticType": "max", "onStatisticField": "MEWhite" },
			////{ "statisticType": "max", "onStatisticField": "MEOneRace" },
			////{ "statisticType": "max", "onStatisticField": "METotal" },


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
		/** The query tasks for each zoom level: blockGroup, tract, and county. */
		queryTasks: {
			blockGroup: null,
			tract: null,
			county: null
		},
		/** Returns a query task appropriate for the scale: county, tract, or block group.
		 * @param {number} scale
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
		 * @param {number} [scale]
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
		 * @param {string} mapServiceUrl The map service that provides aggregate census data.
		 * @param {Object} [options]
		 * @param {number} options.blockGroupLayerId The ID of layer that provides block group level data. Defaults to 0 if options is omitted.
		 * @param {number} options.tractLayerId The ID of layer that provides tract level data. Defaults to 1 if options is omitted.
		 * @param {number} options.countyLayerId The ID of layer that provides county level data. Defaults to 2 if options is omitted.
		 * @constructs
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