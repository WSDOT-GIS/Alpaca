/*global define*/
/*jslint nomen:true,plusplus:true*/
define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/tasks/StatisticDefinition"
], function (declare, lang, Evented, Query, QueryTask, StatisticDefinition) {
	"use strict";
	var ChartDataProvider, StatsLayerInfo, StatsLayerLevel, languageStatDefs, minorityStatDefs;

	function onComplete(/** {esri/tasks/FeatureSet} */ featureSet) {

	}

	function onExecuteForIdsComplete(/** {Number[]} */ featureIds) {
	}

	function onError(/** {Error} */ error) {

	}

	function LayerNotFoundError() {
		Error.apply(this, arguments);
	}

	LayerNotFoundError.prototype = new Error();
	LayerNotFoundError.prototype.constructor = LayerNotFoundError;
	LayerNotFoundError.prototype.name = "LayerNotFoundError";

	// Add a property to query task for the level type (e.g., county)
	lang.extend(QueryTask, {
		zoomLevel: null
	});

	languageStatDefs = [
		{
			"statisticType": "sum",
			"onStatisticField": "English",
			"outStatisticFieldName": "Total_English"
		},
		{
			"statisticType": "sum",
			"onStatisticField": "Spanish",
			"outStatisticFieldName": "Total_Spanish"
		},
		{
			"statisticType": "sum",
			"onStatisticField": "Indo_European",
			"outStatisticFieldName": "Total_Indo_European"
		},
		{
			"statisticType": "sum",
			"onStatisticField": "Asian_PacificIsland",
			"outStatisticFieldName": "Total_Asian_PacificIsland"
		},
		{
			"statisticType": "sum",
			"onStatisticField": "Other",
			"outStatisticFieldName": "Total_Other"
		}
	];

	minorityStatDefs = [
		{
			"statisticType": "sum",
			"onStatisticField": "White"
		},
		{
			"statisticType": "sum",
			"onStatisticField": "NotWhite"
		}
	];

	// Create StatisticDefinition objects...
	(function (statDefArrays) {
		var i, l, sdArr, j, jl, sd, newSd;
		for (i = 0, l = statDefArrays; i < l; i += 1) {
			sdArr = statDefArrays[i];
			for (j = 0, jl = sdArr.length; j < jl; j += 1) {
				sd = sdArr[j];
				newSd = new StatisticDefinition();
				newSd.onStatisticField = sd.onStatisticField;
				newSd.outStatisticFieldName = sd.outStatisticFieldName;
				newSd.statisticType = sd.statisticType;
				sdArr[j] = newSd;
			}
		}
	}([languageStatDefs, minorityStatDefs]));

	StatsLayerInfo = declare([Evented], {
		/** Get the layer info for the currently visible sublayer. 
		 * @returns {esri/layers/LayerInfo}
		 */
		getVisibleLayerInfo: function () {
			var scale, output;

			scale = this.layer._map.getScale();

			if (scale >= this.countyInfo.maxScale) {
				output = this.countyInfo;
			} else if (scale >= this.tractInfo.minScale && scale <= this.tractInfo.maxScale) {
				output = this.tractInfo;
			} else {
				output = this.blockGroupInfo;
			}

			return output;
		},
		getVisibleLayerQueryTask: function () {
			var scale, output;

			scale = this.layer._map.getScale();

			if (scale >= this.countyInfo.maxScale) {
				output = this.countyQueryTask;
			} else if (scale >= this.tractInfo.minScale && scale <= this.tractInfo.maxScale) {
				output = this.tractQueryTask;
			} else {
				output = this.blockGroupQueryTask;
			}

			return output;
		},
		/* Updates the *FeatureIds properties using the specified geometry. 
		If no geometry is specified, the *FeatureIds properties will be set to null.
		* @param {esri/geometry/Geometry} [geometry] Specifies geometries for a filter.
		**/
		updateSelection: function(geometry) {
			var queryTask, query;
			queryTask = this.getVisibleLayerQueryTask();
			query = new Query();
			if (geometry) {
				query.geometry = geometry;
				query.spatialRelationship = Query.SPATIAL_REL_CROSSES;
			}
			queryTask.execute(query);
		},
		/* Runs the query task operations.
		**/
		update: function () {
			var queryTask, query;
			queryTask = this.getVisibleLayerQueryTask();
			query = new Query();
			query.outStatistics = this.statisticDefinitions;
			queryTask.execute(query);
		},
		/** @member {esri/layers/Layer} */
		layer: null,
		/** @member {esri/layers/LayerInfo} */
		blockGroupInfo: null,
		/** @member {esri/layers/LayerInfo} */
		tractInfo: null,
		/** @member {esri/layers/LayerInfo} */
		countyInfo: null,
		/** @member {esri/tasks/QueryTask} */
		blockGroupQueryTask: null,
		/** @member {esri/tasks/QueryTask} */
		tractQueryTask: null,
		/** @member {esri/tasks/QueryTask} */
		countyQueryTask: null,
		/** @member {Array} An array of object ID integers or null. */
		blockGroupFeatureIds: null,
		/** @member {Array} An array of object ID integers or null. */
		tractFeatureIds: null,
		/** @member {Array} An array of object ID integers or null. */
		countyFeatureIds: null,
		/** @member {esri/tasks/StatisticDefinition[]} */
		statisticDefinitions: null,
		constructor: function (/*{esri/layers/ArcGISDynamicMapServiceLayer}*/ layer, statisticDefinitions) {
			var i, l, blockGroupRe, tractRe, countyRe, layerInfo;

			this.layer = layer;
			this.statisticDefinitions = statisticDefinitions;

			blockGroupRe = /Block\s?Group/ig;
			tractRe = /Tract/ig;
			countyRe = /County/ig;


			for (i = 0, l = layer.layerInfos.length; i < l; i += 1) {
				layerInfo = layer.layerInfos[i];
				if (!this.blockGroupInfo && blockGroupRe.test(layerInfo.name)) {
					this.blockGroupInfo = layerInfo;
				} else if (!this.tractInfo && tractRe.test(layerInfo.name)) {
					this.tractInfo = layerInfo;
				} else if (!this.countyInfo && countyRe.test(layerInfo.name)) {
					this.countyInfo = layerInfo;
				}
				// Break out of the loop if everything has been found.
				if (this.blockGroupInfo && this.tractInfo && this.countyInfo) {
					break;
				}
			}

			// Create the query tasks...
			this.blockGroupQueryTask = new QueryTask([layer.url, this.blockGroupInfo.id].join("/"));
			this.blockGroupQueryTask.zoomLevel = "blockGroup";
			this.tractQueryTask = new QueryTask([layer.url, this.tractInfo.id].join("/"));
			this.tractQueryTask.zoomLevel = "tract";
			this.countyQueryTask = new QueryTask([layer.url, this.countyInfo.id].join("/"));
			this.countyQueryTask.zoomLevel = "county";

			// Assign event handlers to query tasks...
			(function (queryTasks) {
				var i, l, qt;
				for (i = 0, l = queryTasks.length; i < l; i++) {
					qt = queryTasks[i];
					qt.on("complete", onComplete);
					qt.on("execute-for-ids-complete", onExecuteForIdsComplete);
					qt.on("error", onError);
				}
			}([this.blockGroupQueryTask, this.tractQueryTask, this.countyQueryTask]));

			this.update();
		}
	});

	ChartDataProvider = declare(Evented, {
		languageLayerInfo: null,
		minorityLayerInfo: null,
		/** Trigger the chart update events.
		*/
		onChartUpdate: function() {

		},
		/**
		@param {esri/Map} map
		*/
		constructor: function (map) {
			var i, l, layerId, layer, languageRe, minorityRe, languageLayer, minorityLayer;
			languageRe = /Language/ig;
			minorityRe = /Minority/ig;

			// Find the language and minority layers
			for (i = 0, l = map.layerIds.length; i < l; i += 1) {
				layerId = map.layerIds[i];
				if (languageLayer && minorityLayer) {
					break;
				} else {
					layer = map.getLayer(layerId);
				}

				if (!languageLayer && languageRe.test(layerId)) {
					languageLayer = layer;
				} else if (!minorityLayer && minorityRe.test(layerId)) {
					minorityLayer = layer;
				}
			}

			if (!languageLayer) {
				throw new LayerNotFoundError("language");
			} else if (!minorityLayer) {
				throw new LayerNotFoundError("minority");
			}

			this.languageLayerInfo = new StatsLayerInfo(languageLayer);
			this.minorityLayerInfo = new StatsLayerInfo(minorityLayer);
		}
	});

	return ChartDataProvider;
});

/*
http://hqolymgis99t/arcgis/rest/services/Demographic/Language/MapServer/3/query?returnGeometry=false&groupByFieldsForStatistics=[English%2CSpanish%2CInto_European%2CAsian_PacificIsland%2COther]&outStatistics=[%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22English%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_English%22%0D%0A%09}%2C%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22Spanish%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_Spanish%22%0D%0A%09}%2C%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22Indo_European%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_Indo_European%22%0D%0A%09}%2C%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22Asian_PacificIsland%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_Asian_PacificIsland%22%0D%0A%09}%2C%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22Other%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_Other%22%0D%0A%09}%0D%0A]&f=html
http://hqolymgis99t/arcgis/rest/services/Demographic/Language/MapServer/3/query?returnGeometry=false&outStatistics=%5B%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22English%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_English%22%0D%0A%7D%2C%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22Spanish%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_Spanish%22%0D%0A%7D%2C%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22Indo_European%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_Indo_European%22%0D%0A%7D%2C%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22Asian_PacificIsland%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_Asian_PacificIsland%22%0D%0A%7D%2C%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22Other%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_Other%22%0D%0A%7D%0D%0A%5D&f=pjson
[
	{
		"statisticType": "sum",
		"onStatisticField": "English",
		"outStatisticFieldName": "Total_English"
	},
	{
		"statisticType": "sum",
		"onStatisticField": "Spanish",
		"outStatisticFieldName": "Total_Spanish"
	},
	{
		"statisticType": "sum",
		"onStatisticField": "Indo_European",
		"outStatisticFieldName": "Total_Indo_European"
	},
	{
		"statisticType": "sum",
		"onStatisticField": "Asian_PacificIsland",
		"outStatisticFieldName": "Total_Asian_PacificIsland"
	},
	{
		"statisticType": "sum",
		"onStatisticField": "Other",
		"outStatisticFieldName": "Total_Other"
	}
]
*/