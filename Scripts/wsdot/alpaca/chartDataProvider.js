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
	"./ageData",
	"./veteranData",
	"./povertyData",
	"./disabilityData",
	"./utils",
	"dojo/text!alpaca/aggregate_fields.json"
], function (
	declare, Deferred, Evented, esriConfig, Graphic, Query, QueryTask, StatisticDefinition,
	RaceData, LanguageData, AgeData, VeteranData, PovertyData, DisabilityData, utils, fields)
{
	/** Provides classes for updating charts.
	 * @exports wsdot/alpaca/chartDataProvider
	 */
	"use strict";
	var ChartDataProvider, marginOfErrorRe, raceFieldRe, popFieldRe, povFieldRe, langFieldRe, disabilityFieldRe, numberTypesRe;

	// These regular expressions detect the charts
	marginOfErrorRe = /^ME/;
	langFieldRe = /^(?:Total(?:(?:English)|(?:Spanish)|(?:IndoEuropean)|(?:AsianPacificIsland)|(?:Other)))$/i;
	popFieldRe = /^[MF]_([0-9]{1,2})?([a-z]+)?[0-9]+$/i;
	// vetFieldRe = /^[MF](Age[0-9]{1,2})?([a-z]+)?[0-9]+(?:Non)?Vet$/i;
	povFieldRe = /^((?:Total_POV)|(?:Poverty_(?:Fed)|(?:State))|(?:PctPoverty)|(?:Income))$/i;
	raceFieldRe = /^(?:(?:(?:Not)?White)|(?:AfricanAmerican_Black)|(?:AmericanIndian_AlaskaNative)|(?:AsianAlone)|(?:NativeHawaiian_PacificIsl)|(?:SomeOtherRace)|(?:TwoOrMoreRaces))$/i;
	disabilityFieldRe = /^(?:(?:Total_DIS)|(?:\w+Disabled))$/i;
	numberTypesRe = /(?:Integer)|(?:Double})/i;

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

	/** Generate a statistic definition
	 * @param {string} [statisticType] Specify a statistic type. Defaults to "sum" if omitted.
	 * @param {string} [outStatisticFieldName]
	 * @returns {esri/tasks/StatisticDefinition}
	 */
	Field.prototype.toStatisticDefinition = function (statisticType, outStatisticFieldName) {
		var statDef;
		statDef = new StatisticDefinition();
		statDef.onStatisticField = this.name;
		statDef.statisticType = statisticType || "sum";
		statDef.outStatisticFieldName = outStatisticFieldName || this.name;
		return statDef;
	};

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

	/** This object, upon creation, sorts fields into categories.
	 * @constructor
	 */
	function FieldGroups(/**{Field[]}*/ fields) {
		var i, l, field;
		/**@member {Field[]}*/
		this.language = [];
		/**@member {Field[]}*/
		this.population = [];
		/**@member {Field[]}*/
		this.veteran = [];
		/**@member {Field[]}*/
		this.poverty = [];
		/**@member {Field[]}*/
		this.race = [];
		/**@member {Field[]}*/
		this.disability = [];
		/**@member {Field[]}*/
		this.other = [];

		for (i = 0, l = fields.length; i < l; i += 1) {
			field = fields[i];
			if (field && field.name && !marginOfErrorRe.test(field.name) && numberTypesRe.test(field.type)) {
				if (langFieldRe.test(field.name)) {
					this.language.push(field);
				} else if (popFieldRe.test(field.name)) {
					this.population.push(field);
				} else if (VeteranData.fieldRegExp.test(field.name)) {
					this.veteran.push(field);
				} else if (povFieldRe.test(field.name)) {
					this.poverty.push(field);
				} else if (raceFieldRe.test(field.name)) {
					this.race.push(field);
				} else if (disabilityFieldRe.test(field.name)) {
					this.disability.push(field);
				} else {
					this.other.push(field);
				}
			} else {
				this.other.push(field);
			}
		}
	}

	/** Creates an array of statistic definitions.
	 * @returns {StatisticDefinition[]}
	 */
	FieldGroups.prototype.toStatisticDefinitions = function () {
		var output = [];

		function toSD(value /*, index, traversedObject*/) {
			return value.toStatisticDefinition();
		}

		output = output.concat(this.language.map(toSD));
		output = output.concat(this.population.map(toSD));
		output = output.concat(this.veteran.map(toSD));
		output = output.concat(this.poverty.map(toSD));
		output = output.concat(this.race.map(toSD));
		output = output.concat(this.disability.map(toSD));

		return output;
	};

	/** Ungroups the fields in the FieldGroups object into an array of Field objects.  The results can be used as the value of the Query.outFields property.
	 * @returns {Field[]}
	 */
	FieldGroups.prototype.getOutFields = function () {
		var output = [];

		function getName(value) {
			return value.name;
		}

		output = output.concat(this.language.map(getName));
		output = output.concat(this.population.map(getName));
		output = output.concat(this.veteran.map(getName));
		output = output.concat(this.poverty.map(getName));
		output = output.concat(this.race.map(getName));
		output = output.concat(this.disability.map(getName));

		return output;
	};

	// Fields is a string containing JSON: An array of field objects. Parse to actual Field objects.
	fields = JSON.parse(fields, parseField);
	fields = new FieldGroups(fields);

	/** The results of a map service layer query, grouped into categories of data objects.
	 * @member {RaceData} race
	 * @member {LanguageData} language
	 * @member {AgeData} age
	 * @member {VeteranData} veteran
	 * @member {PovertyData} poverty
	 * @member {DisabilityData} disability
	 * @constructor
	 */
	function ChartData(/**{(Object|ChartData)}*/ queryResults) {
		/** Provices race data */
		this.race = queryResults.race ? new RaceData(queryResults.race) : new RaceData(queryResults);
		/** Provides language data */
		this.language = queryResults.language ? new LanguageData(queryResults.language) : new LanguageData(queryResults);

		this.age = queryResults.age ? new AgeData(queryResults.age) : new AgeData(queryResults);

		this.veteran = queryResults.veteran ? new VeteranData(queryResults.veteran) : new VeteranData(queryResults);

		this.poverty = queryResults.poverty ? new PovertyData(queryResults.poverty) : new PovertyData(queryResults);

		this.disability = queryResults.disability ? new DisabilityData(queryResults.disability) : new DisabilityData(queryResults);
	}

	/** 
	 * @param {string} type - Choices are "statewide", "service area" or "aoi"
	 * @param {esri/Graphic[]} features - An array of graphics.
	 * @param {(ChartData|Object.<string, number>)} chartData - Either a {@link ChartData} or the parameter to be passed to the {@link ChartData} constructor.
	 * @param {Geometry} [originalGeometry=null]
	 *
	 * @member {string} type - Will have one of the following values: "statewide", "service area" or "aoi"
	 * @member {esri/Graphic[]} features - An array of graphics.
	 * @member {ChartData} chartData
	 * @member {Geometry} originalGeometry
	 * @constructor
	 */
	function ChartDataQueryResult(type, features, chartData, originalGeometry) {
		this.type = type || null;
		this.features = features || null;
		this.chartData = (chartData instanceof ChartData) ? chartData : new ChartData(chartData);
		this.originalGeometry = originalGeometry || null;
	}

	/** An object used to provide chart data.
	 * @exports ChartDataProvider
	 * @fires ChartDataProvider#totals-determined - Fired when the data for the charts has been calculated.
	 * @fires ChartDataProvider#query-complete - Occurs when a query has been completed.
	 * @fires ChartDataProvider#error - LabelInfo
	 */
	ChartDataProvider = declare(Evented, {

		_statisticDefinitions: fields.toStatisticDefinitions(),

		/** @typedef {Object} ChartDataProvider~QueryTasks
		 * @property {esri/tasks/QueryTask} blockGroup
		 * @property {esri/tasks/QueryTask} tract
		 * @property {esri/tasks/QueryTask} county
		 */

		/** @member {ChartDataProvider~QueryTasks} The query tasks for each zoom level: blockGroup, tract, and county. */
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

		/** Get a service area graphic using its FIPS code.
		 * @param {number} fipsCode - County's FIPS code. Known as GEOID in the aggregate layer, JURFIPSDSG in the county layer.
		 * @param {Geometry} [serviceAreaGeometry] - If this function is being used to select an AOI, use this parameter to specifiy the service area.
		 * @param {Number} [scale] The scale of the map. Used to determine which query task is used (County, Tract, or Block Group). Not required for statewide.
		 * @returns {dojo/Deferred} The "resolve" function contains a single esri/Graphic parameter if the FIPS code is valid.
		 */
		getCountyGraphic: function (fipsCode, serviceAreaGeometry, scale) {
			var self = this, queryTask, query, deferred = new Deferred();
			queryTask = this.queryTasks.county;
			query = new Query();
			query.where = "GEOID = " + fipsCode;
			query.outFields = fields.getOutFields();
			query.returnGeometry = true;
			queryTask.execute(query, function (/**{FeatureSet}*/ featureSet) {
				var countyGraphic = featureSet.features[0];
				var queryResult;
				if (!serviceAreaGeometry) {
					queryResult = new ChartDataQueryResult("service area", featureSet.features, countyGraphic.attributes);
					self.emit("totals-determined", queryResult.chartData);
					self.emit("query-complete", queryResult);
					deferred.resolve(queryResult);
				} else {
					self.getSelectionGraphics(countyGraphic.geometry, scale, false, serviceAreaGeometry).then(function (queryResult) {
						self.emit("totals-determined", queryResult.chartData);
						self.emit("query-complete", queryResult);
						deferred.resolve(queryResult);
					});
				}
			}, function (error) {
				deferred.reject(error);
				self.emit("error", error);
			});
			return deferred;
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
				queryTask = self.queryTasks.county; //self.getQueryTaskForScale(scale);
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

			/** Performs a query against the aggregate layer using user-specified geometry.
			 * @param {esri/geometry/Geometry} geometry - The geometry that the user drew on the map.
			 */
			function performQuery(geometry) {
				var query, queryTask;
				// Get the query task for the current scale.
				queryTask = self.getQueryTaskForScale(scale);
				query = new Query();

				// Setup the query.
				query.geometry = geometry;
				query.outFields = fields.getOutFields();
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
						// Skip the union operation if "geometries" only contains one geometry.
						if (geometries.length > 1) {
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
							graphic = new Graphic(geometry, null, totals);
							output = new ChartDataQueryResult(type, [graphic], totals, null);
							self.emit("query-complete", output);
							deferred.resolve(output);
						}
					} else {
						output = new ChartDataQueryResult(type, featureSet.features, totals, drawnGeometry);
						deferred.resolve(output);
						self.emit("query-complete", output);
						deferred.resolve(output);
					}
				}, function (error) {
					self.emit("error", error);
					deferred.reject(error);
				});
			}

			// Determine the type of selection query.
			type = !drawnGeometry ? "statewide" : union ? "service area" : "aoi";

			if (!drawnGeometry) {
				// If the user has not drawn a geometry, perform the statewide query.
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
		 * @param {ChartDataProviderConstructorOptions} [options]
		 * @param {number} [options.blockGroupLayerId=0] The ID of layer that provides block group level data.
		 * @param {number} [options.tractLayerId=1] The ID of layer that provides tract level data.
		 * @param {number} [options.countyLayerId=2] The ID of layer that provides county level data.
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