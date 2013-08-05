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
	var ChartDataProvider, StatsLayerInfo, StatsLayerLevel,
		languageStatDefs, minorityStatDefs, blockGroupRe, tractRe, countyRe;



	function LayerNotFoundError() {
		Error.apply(this, arguments);
	}

	blockGroupRe = /Block\s?Group/ig;
	tractRe = /Tract/ig;
	countyRe = /County/ig;

	LayerNotFoundError.prototype = new Error();
	LayerNotFoundError.prototype.constructor = LayerNotFoundError;
	LayerNotFoundError.prototype.name = "LayerNotFoundError";

	// Add a property to query task for the level type (e.g., county)
	lang.extend(QueryTask, {
		zoomLevel: null
	});

	languageStatDefs = [
		{
			statisticType: "sum",
			onStatisticField: "English",
			outStatisticFieldName: "Total_English"
		},
		{
			statisticType: "sum",
			onStatisticField: "Spanish",
			outStatisticFieldName: "Total_Spanish"
		},
		{
			statisticType: "sum",
			onStatisticField: "Indo_European",
			outStatisticFieldName: "Total_Indo_European"
		},
		{
			statisticType: "sum",
			onStatisticField: "Asian_PacificIsland",
			outStatisticFieldName: "Total_Asian_PacificIsland"
		},
		{
			statisticType: "sum",
			onStatisticField: "Other",
			outStatisticFieldName: "Total_Other"
		}
	];

	minorityStatDefs = [
		{
			statisticType: "sum",
			onStatisticField: "White"
		},
		{
			statisticType: "sum",
			onStatisticField: "NotWhite"
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
				newSd.outStatisticFieldName = sd.outStatisticFieldName || null;
				newSd.statisticType = sd.statisticType;
				sdArr[j] = newSd;
			}
			statDefArrays[i] = sdArr;
		}
	}([languageStatDefs, minorityStatDefs]));

	StatsLayerLevel = declare([Evented], {
		zoomLevel: null,
		layerInfo: null,
		queryTask: null,
		oidFieldName: null,
		nonOidfieldNames: null,
		featureIds: null,
		statisticDefinitions: null,
		/* Updates the featureIds property using the specified geometry. 
		If no geometry is specified, the featureId properties will be set to null.
		@param {esri/geometry/Geometry} [geometry] Specifies geometries for a filter.
		**/
		updateSelection: function (geometry) {
			var self = this, query;
			query = new Query();
			if (geometry) {
				query.geometry = geometry;
				query.spatialRelationship = Query.SPATIAL_REL_CROSSES;
			}
			this.queryTask.execute(query);
		},
		/**
		@param {String} zoomLevel
		@param {esri/layers/Layer} layer
		@param {esri/layers/LayerInfo} layerInfo
		@param {esri/tasks/StatisticDefinition[]} statisticDefinitions
		*/
		constructor: function (zoomLevel, layer, layerInfo, statisticDefinitions) {
			function onComplete(/** {esri/tasks/FeatureSet} */ featureSet) {

			}

			function onExecuteForIdsComplete(/** {Number[]} */ featureIds) {
			}

			function onError(/** {Error} */ error) {

			}

			this.zoomLevel = zoomLevel;
			this.layerInfo = layerInfo;
			this.statisticDefinitions = statisticDefinitions;
			this.queryTask = new QueryTask([layer.url, layerInfo.id].join("/"));
		}
	});
	

	StatsLayerInfo = declare([Evented], {
		/** Get the layer info for the currently visible sublayer. 
		 * @returns {esri/layers/LayerInfo}
		 */
		getVisibleLayerInfo: function () {
			var scale, output;

			scale = this.layer._map.getScale();

			if (scale >= this.countyLayerLevel.layerInfo.maxScale) {
				output = this.countyLayerLevel.layerInfo;
			} else if (scale >= this.tractLayerLevel.layerInfo.minScale && scale <= this.tractLayerLevel.layerInfo.maxScale) {
				output = this.tractLayerLevel.layerInfo;
			} else {
				output = this.blockGroupLayerLevel.layerInfo;
			}

			return output;
		},
		getVisibleLayerQueryTask: function () {
			var scale, output;

			scale = this.layer._map.getScale();

			if (scale >= this.countyLayerLevel.layerInfo.maxScale) {
				output = this.countyLayerLevel.queryTask;
			} else if (scale >= this.tractLayerLevel.layerInfo.minScale && scale <= this.tractLayerLevel.layerInfo.maxScale) {
				output = this.tractLayerLevel.queryTask;
			} else {
				output = this.blockGroupLayerLevel.queryTask;
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
		/** @member {StatsLayerLevel} */
		blockLayerLevel: null,
		/** @member {StatsLayerLevel} */
		tractLayerLevel: null,
		/** @member {StatsLayerLevel} */
		countyLayerLevel: null,
		constructor: function (/*{esri/layers/ArcGISDynamicMapServiceLayer}*/ layer, /**{esri/layers/StatisticDefinition[]}*/statisticDefinitions) {
			var i, l, layerInfo;

			this.layer = layer;
			this.statisticDefinitions = statisticDefinitions;




			for (i = 0, l = layer.layerInfos.length; i < l; i += 1) {
				layerInfo = layer.layerInfos[i];
				if (!this.blockLayerLevel && blockGroupRe.test(layerInfo.name)) {
					// layer, layerInfo, statisticDefinitions
					this.blockLayerLevel = new StatsLayerLevel("block-group", layer, layerInfo, statisticDefinitions);
				} else if (!this.tractLayerLevel && tractRe.test(layerInfo.name)) {
					this.tractLayerLevel = new StatsLayerLevel("tract", layer, layerInfo, statisticDefinitions);
				} else if (!this.countyLayerLevel && countyRe.test(layerInfo.name)) {
					this.countyLayerLevel = new StatsLayerLevel("county", layer, layerInfo, statisticDefinitions);
				}
				// Break out of the loop if everything has been found.
				if (this.blockLayerLevel && this.tractLayerLevel && this.countyLayerLevel) {
					break;
				}
			}

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

			this.languageLayerInfo = new StatsLayerInfo(languageLayer, languageStatDefs);
			this.minorityLayerInfo = new StatsLayerInfo(minorityLayer, minorityStatDefs);
		}
	});

	return ChartDataProvider;
});

/*
http://hqolymgis99t/arcgis/rest/services/Demographic/Language/MapServer/3/query?returnGeometry=false&groupByFieldsForStatistics=[English%2CSpanish%2CInto_European%2CAsian_PacificIsland%2COther]&outStatistics=[%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22English%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_English%22%0D%0A%09}%2C%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22Spanish%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_Spanish%22%0D%0A%09}%2C%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22Indo_European%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_Indo_European%22%0D%0A%09}%2C%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22Asian_PacificIsland%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_Asian_PacificIsland%22%0D%0A%09}%2C%0D%0A%09{%0D%0A%09%09%22statisticType%22%3A+%22sum%22%2C%0D%0A%09%09%22onStatisticField%22%3A+%22Other%22%2C%0D%0A%09%09%22outStatisticField%22%3A+%22Total_Other%22%0D%0A%09}%0D%0A]&f=html
http://hqolymgis99t/arcgis/rest/services/Demographic/Language/MapServer/3/query?returnGeometry=false&outStatistics=%5B%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22English%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_English%22%0D%0A%7D%2C%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22Spanish%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_Spanish%22%0D%0A%7D%2C%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22Indo_European%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_Indo_European%22%0D%0A%7D%2C%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22Asian_PacificIsland%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_Asian_PacificIsland%22%0D%0A%7D%2C%0D%0A%7B%0D%0A%22statisticType%22%3A+%22sum%22%2C%0D%0A%22onStatisticField%22%3A+%22Other%22%2C%0D%0A%22outStatisticField%22%3A+%22Total_Other%22%0D%0A%7D%0D%0A%5D&f=pjson
[
	{
		statisticType: "sum",
		onStatisticField: "English",
		outStatisticFieldName: "Total_English"
	},
	{
		statisticType: "sum",
		onStatisticField: "Spanish",
		outStatisticFieldName: "Total_Spanish"
	},
	{
		statisticType: "sum",
		onStatisticField: "Indo_European",
		outStatisticFieldName: "Total_Indo_European"
	},
	{
		statisticType: "sum",
		onStatisticField: "Asian_PacificIsland",
		outStatisticFieldName: "Total_Asian_PacificIsland"
	},
	{
		statisticType: "sum",
		onStatisticField: "Other",
		outStatisticFieldName: "Total_Other"
	}
]
*/