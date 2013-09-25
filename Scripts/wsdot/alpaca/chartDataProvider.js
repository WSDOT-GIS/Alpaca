/*global define*/
/*jslint nomen:true,plusplus:true*/
define([
	"dojo/_base/declare",
	"dojo/Deferred",
	"dojo/Evented",
	"esri/config",
	"esri/graphic",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/tasks/StatisticDefinition",
	"./raceData",
	"./languageData",
	"./utils"
], function (declare, Deferred, Evented, esriConfig, Graphic, Query, QueryTask, StatisticDefinition, RaceData, LanguageData, utils) {
	/** Provides classes for updating charts.
	 * @exports wsdot/alpaca/chartDataProvider
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

	/** An object used to provide chart data.
	 * @fires chartDataProvider#service-area-totals-determined
	 */
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
		/** Determines a service area based on a given geometry and scale.
		 * @param {esri/Geometry} geometry The geometry used to determine the service area.
		 * @param {Number} scale The scale of the map. Used to determine which query task is used (County, Tract, or Block Group)
		 * @param {Boolean} union Set to true to union the returned geometry. (Output will be a single graphic in this case.) Set to false to skip the union operation.
		 * @returns {dojo/Deferred} The "resolve" function contains a single esri/Graphic parameter if union is true.
		 */
		getSelectionGraphics: function(geometry, scale, union) {
			var self = this, query, queryTask, deferred = new Deferred();

			if (!geometry) {
				throw new TypeError("No geometry was provided.");
			}

			// Get the query task for the current scale.
			queryTask = self.getQueryTaskForScale(scale);

			// Setup the query.
			query = new Query();
			query.geometry = geometry;
			query.outFields = [
				"OneRace",
				"White",
				"NotWhite",
				"English",
				"Spanish",
				"Indo_European",
				"Asian_PacificIsland",
				"Other"
			];

			// Query to determine intersecting geometry.
			queryTask.execute(query, function (/** {FeatureSet}*/ featureSet) {
				var totals, geometries = [], i, l, graphic, attrName, geometryService, output;
				// Initiate count totals.
				totals = {};

				for (i = 0, l = featureSet.features.length; i < l; i += 1) {
					graphic = featureSet.features[i];
					// Add the geometry to the geometries array.
					if (graphic.geometry) {
						geometries.push(graphic.geometry);
					}
					// Add the values from the attributes to the totals
					for (attrName in graphic.attributes) {
						if (graphic.attributes.hasOwnProperty(attrName)) {
							if (!totals[attrName]) {
								totals[attrName] = graphic.attributes[attrName];
							} else {
								totals[attrName] += graphic.attributes[attrName];
							}
						}
					}
				}

				if (union) {

					/**
					 * service-area-totals-event
					 * @event chartDataProvider#service-area-totals-determined
					 * @type {object}
					 * @property {number} OneRace
					 * @property {number} White
					 * @property {number} NotWhite
					 * @property {number} English
					 * @property {number} Spanish
					 * @property {number} Indo_European
					 * @property {number} Asian_PacificIsland
					 * @property {number} Other
					 */
					self.emit("service-area-totals-determined", totals);

					// Update progress on the deferred object.
					deferred.progress({
						message: "totals determined",
						totals: totals
					});

					// Get the default geometry service.
					geometryService = esriConfig.defaults.geometryService;
					if (!geometryService) {
						throw new TypeError("esri/config.defaults.geometryService not defined.");
					}
					geometryService.union(geometries, function (geometry) {
						graphic = new Graphic(geometry, null, totals);
						output = {
							chartData: new ChartData(totals),
							features: [graphic]
						};
						self.emit("union-complete", output);
						deferred.resolve(output);
					}, function (error) {
						error.totals = new ChartData(totals);
						deferred.reject(error);
					});
				} else {
					output = {
						chartdata: new ChartData(totals),
						features: featureSet.features
					};
					deferred.resolve(output);
					self.emit("selection-query-complete", output);
				}
			}, function (error) {
				self.emit("service-area-query-error", error);
				deferred.reject(error);
			});

			return deferred.promise;
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