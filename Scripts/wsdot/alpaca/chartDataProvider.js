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
	"./utils",
	"dojo/text!alpaca/aggregate_fields.txt"
], function (declare, Deferred, Evented, esriConfig, Graphic, Query, QueryTask, StatisticDefinition, RaceData, LanguageData, utils, fields) {
	/** Provides classes for updating charts.
	 * @exports wsdot/alpaca/chartDataProvider
	 */
	"use strict";
	var ChartDataProvider, marginOfErrorRe, raceFieldRe, popFieldRe, vetFieldRe, povFieldRe, langFieldRe;

	// These regular expressions detect the charts
	marginOfErrorRe = /^ME/;
	langFieldRe = /^(?:Total(?:(?:English)|(?:Spanish)|(?:IndoEuropean)|(?:AsianPacificIsland)|(?:Other)))$/i;
	popFieldRe = /^[MF]_([0-9]{1,2})?([a-z]+)?[0-9]+$/i;
	vetFieldRe = /^[MF](Age[0-9]{1,2})?([a-z]+)?[0-9]+(?:Non)?Vet$/i;
	povFieldRe = /^((?:Total_POV)|(?:Poverty_(?:Fed)|(?:State))|(?:PctPoverty)|(?:Income))$/i;
	raceFieldRe = /^(?:(?:(?:Not)?White)|(?:AfricanAmerican_Black)|(?:AmericanIndian_AlaskaNative)|(?:AsianAlone)|(?:NativeHawaiian_PacificIsl)|(?:SomeOtherRace)|(?:TwoOrMoreRaces))$/i;

	/** Represents a field.
	 * @constructor
	 */
	function Field(v) {
		this.alias = v.alias || null;
		this.domain = v.domain || null;
		this.editable = v.editable || false;
		this.length = v.length || null;
		this.name = v.name || null;
		this.type = v.type || null;
	}

	/** Used by JSON.parse to create esri/layers/Field objects.
	 */
	function parseField(k, v) {
		var output;
		if (v && v.name && v.type) {
			output = new Field(v);
		} else {
			output = v;
		}
		return output;
	}


	function FieldGroups(/**{Field}*/ fields) {
		var i, l, field;
		this.language = [];
		this.population = [];
		this.veteran = [];
		this.poverty = [];
		this.race = [];
		this.other = [];

		for (i = 0, l = fields.length; i < l; i += 1) {
			field = fields[i];
			if (field && field.name && !marginOfErrorRe.test(field.name)) {
				if (langFieldRe.test(field.name)) {
					this.language.push(field);
				} else if (popFieldRe.test(field.name)) {
					this.population.push(field);
				} else if (vetFieldRe.test(field.name)) {
					this.veteran.push(field);
				} else if (povFieldRe.test(field.name)) {
					this.poverty.push(field);
				} else if (raceFieldRe.test(field.name)) {
					this.race.push(field);
				} else {
					this.other.push(field);
				}
			} else {
				this.other.push(field);
			}
		}
	}

	// Fields is a string containing JSON: An array of field objects. Parse to actual Field objects.
	fields = JSON.parse(fields, parseField);
	fields = new FieldGroups(fields);

	console.log(fields);

	/**
	 * @constructor
	 */
	function ChartData(/**{Object}*/ queryResults) {
		/** Provices race data */
		this.race = queryResults.race ? new RaceData(queryResults.race) : new RaceData(queryResults);
		/** Provides language data */
		this.language = queryResults.language  ? new LanguageData(queryResults.language) : new LanguageData(queryResults);
	}

	/**
	 * @param {string} type Choices are "statewide", "service area" or "selection"
	 * @param {esri/Graphic[]} features An array of graphics.
	 * @param {(ChartData|Object.<string, number>)} chartData Either a {@link ChartData} or the parameter to be passed to the {@link ChartData} constructor.
	 * @constructor
	 */
	function ChartDataQueryResult(type, features, chartData, originalGeometry) {
		this.type = type || null;
		this.features = features || null;
		this.chartData = (chartData instanceof ChartData) ? chartData : new ChartData(chartData);
		this.originalGeometry = originalGeometry || null;
	}


	/** Creates an array of statistic definition objects
	 * @returns {esri/tasks/StatisticDefinition[]}
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
	 * @fires ChartDataProvider#totals-determined Fired when the data for the charts has been calculated.
	 * @fires ChartDataProvider#query-complete Occurs when a query has been completed.
	 * @fires ChartDataProvider#error
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

		/** Determines a service area based on a given geometry and scale.
		 * @param {esri/Geometry} [drawnGeometry] The geometry used to determine the service area or selection. Not required for statewide.
		 * @param {Number} [scale] The scale of the map. Used to determine which query task is used (County, Tract, or Block Group). Not required for statewide.
		 * @param {Boolean} [union] Set to true to union the returned geometry. (Output will be a single graphic in this case.) Set to false to skip the union operation (for selection).
		 * @param {esri/Geometry} [serviceAreaGeometry] When making a selection, use this parameter to filter by a service area geometry.
		 * @returns {dojo/Deferred} The "resolve" function contains a single esri/Graphic parameter if union is true.
		 */
		getSelectionGraphics: function(drawnGeometry, scale, union, serviceAreaGeometry) {
			var self = this, deferred = new Deferred(), type, geometryService;

			function getGeometryService() {
				// Get the default geometry service.
				var geometryService = esriConfig.defaults.geometryService;
				if (!geometryService) {
					(function () {
						var error = new TypeError("esri/config.defaults.geometryService not defined.");
						deferred.reject(error);
						self.emit("error", error);
					}());
				}
				return geometryService;
			}

			/** Performs the statewide aggregate query.
			 */
			function performAggregateQuery() {
				var query, queryTask;
				queryTask = self.getQueryTaskForScale(scale);
				query = new Query();

				type = "statewide";
				// Perform a query for statewide statistics.
				query.outStatistics = self._statisticDefinitions;
				queryTask.execute(query, function (/** {FeatureSet}*/ featureSet) {
					var results, output;
					results = featureSet.features[0].attributes;
					output = new ChartDataQueryResult(type, null, results);
					self.emit("totals-determined", output.chartData);
					self.emit("query-complete", output);
					deferred.resolve(output);
				}, function (/** {Error} */error) {
					var output = {
						type: type,
						query: query,
						error: error
					};
					self.emit("error", output);
					deferred.reject(output);
				});
			}

			function performQuery(geometry) {
				var query, queryTask;
				// Get the query task for the current scale.
				queryTask = self.getQueryTaskForScale(scale);
				query = new Query();

				// Setup the query.
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
				query.returnGeometry = true;

				// Query to determine intersecting geometry.
				queryTask.execute(query, function (/** {FeatureSet}*/ featureSet) {
					var totals, geometries = [], i, l, graphic, attrName, output;




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

					totals = new ChartData(totals);

					if (union) {


						self.emit("totals-determined", totals);

						// Update progress on the deferred object.
						deferred.progress({
							message: "totals determined",
							totals: totals
						});

						geometryService = getGeometryService();
						geometryService.union(geometries, function (geometry) {
							graphic = new Graphic(geometry, null, totals);
							output = new ChartDataQueryResult(type, [graphic], totals, null);
							self.emit("query-complete", output);
							deferred.resolve(output);
						}, function (error) {
							error.totals = totals;
							deferred.reject(error);
						});
					} else {
						output = new ChartDataQueryResult(type, featureSet.features, totals, drawnGeometry);
						deferred.resolve(output);
						self.emit("query-complete", output);
					}
				}, function (error) {
					self.emit("error", error);
					deferred.reject(error);
				});
			}

			// Determine the type of selection query.
			type = !drawnGeometry ? "statewide" : union ? "service area" : "selection";



			if (!drawnGeometry) {
				performAggregateQuery();
			} else {
				if (serviceAreaGeometry) {
					// Perform intersect to limit geometries by service area.
					geometryService = getGeometryService();

					geometryService.intersect([drawnGeometry], serviceAreaGeometry, function (/**{esri/Geometry[]}*/ geometries) {
						if (geometries && geometries.length >= 1) {
							performQuery(geometries[0]);
						}
					}, function (error) {
						self.emit("intersect error", error);
						deferred.reject(error);
					});
					
				} else {
					performQuery(drawnGeometry);
				}


			}

			/**
			 * totals determined event
			 *
			 * @event chartDataProvider#totals-determined
			 * @type {ChartData}
			 */

			/**
			 * query complete event.
			 *
			 * @event chartDataProvider#query-complete
			 * @type {ChartDataQueryResult}
			 */

			/**
			 * error event.
			 *
			 * @event chartDataProvider#error
			 * @type {(error|object)}
			 */

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

			
		}
	});

	// Make the chart data class available outside the module.
	ChartDataProvider.ChartData = ChartData;
	ChartDataProvider.ChartDataQueryResult = ChartDataQueryResult;

	return ChartDataProvider;
});