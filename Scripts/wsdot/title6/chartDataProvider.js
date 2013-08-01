/*global define*/
/*jslint nomen:true*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"esri/tasks/query",
	"esri/tasks/QueryTask"
], function (declare, Evented, Query, QueryTask) {
	"use strict";
	var ChartDataProvider, StatsLayerInfo;

	function LayerNotFoundError() {
		Error.apply(this, arguments);
	}

	LayerNotFoundError.prototype = new Error();
	LayerNotFoundError.prototype.constructor = LayerNotFoundError;
	LayerNotFoundError.prototype.name = "LayerNotFoundError";

	StatsLayerInfo = declare(null, {
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
		constructor: function (/*{esri/layers/ArcGISDynamicMapServiceLayer}*/ layer) {
			var i, l, blockGroupRe, tractRe, countyRe, layerInfo;

			this.layer = layer;
			this.blockGroupInfo = null;
			this.tractInfo = null;
			this.countyInfo = null;

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
		}
	});

	ChartDataProvider = declare(Evented, {
		languageLayerInfo: null,
		minorityLayerInfo: null,
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