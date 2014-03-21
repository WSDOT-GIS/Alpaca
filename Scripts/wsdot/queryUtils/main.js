/*global define*/
define([
	"dojo/_base/declare",
	"dojo/Deferred",
	"esri/request",
	"esri/tasks/QueryTask",
	"esri/tasks/query"
], function (declare, Deferred, request, QueryTask, Query) {

	/**
	 * Utilities for querying features from a layer.
	 * 
	 * @module "wsdot/layerUtils"
	 */

	/**
	 * Information about a map service layer or a feature service.
	 * @external Layer
	 * @see {link http://resources.arcgis.com/en/help/arcgis-rest-api/#/Layer_Table/02r3000000zr000000/}
	 */

	/**
	 * 
	 * @external "esri/layers/FeatureLayer"
	 * @see {link https://developers.arcgis.com/javascript/jsapi/featurelayer-amd.html}
	 */

	/**
	 * 
	 * @external "dojo/Deferred"
	 * @see {link http://dojotoolkit.org/reference-guide/dojo/Deferred.html}
	 */

	/**
	 * @external "esri/tasks/QueryTask"
	 * @see {link https://developers.arcgis.com/javascript/jsapi/querytask-amd.html}
	 */

	/**
	 * @external "esri/tasks/Query"
	 * @see {link https://developers.arcgis.com/javascript/jsapi/query-amd.html}
	 */

	/**
	 * @external "esri/layers/ArcGISDynamicMapServiceLayer"
	 * @see {link https://developers.arcgis.com/javascript/jsapi/arcgisdynamicmapservicelayer-amd.html}
	 */

	/**
	 * @external "esri/layers/ArcGISTiledMapServiceLayer"
	 * @see {link https://developers.arcgis.com/javascript/jsapi/arcgistiledmapservicelayer-amd.html}
	 */

	/**
	 * @external "esri/tasks/FeatureSet"
	 * @see {link https://developers.arcgis.com/javascript/jsapi/featureset-amd.html}
	 */

	/**
	 * Gets information about a layer.
	 * @param {(string|"esri/layer/FeatureLayer")} urlOrFeatureLayer - Either the URL to a feature layer or a FeatureLayer object.
	 * @returns {"dojo/Deferred"}
	 */
	function getLayerInfo(urlOrFeatureLayer) {
		var deferred;
		if (typeof urlOrFeatureLayer === "string") {
			deferred = request({
				url: urlOrFeatureLayer,
				content: {
					f: "json"
				}
			});
		} else {
			deferred = new Deferred();
			deferred.resolve(urlOrFeatureLayer);
		}

		return deferred;
	}

	/** 
	 * @param {number[]} objectIds
	 * @param {number} maxRecordCount
	 * @returns {Array.<Array.<number>>}
	 */
	function breakObjectIdsIntoGroups(objectIds, maxRecordCount) {
		var output = [], currentGroup;
		/*jshint eqnull:true*/
		if (maxRecordCount == null) {
		/*jshint eqnull:false*/
			output.push(objectIds);
		} else {
			for (var i = 0, l = objectIds.length; i < l; i += 1) {
				if (i % maxRecordCount === 0) {
					currentGroup = [];
					output.push(currentGroup);
				}
				currentGroup.push(objectIds[i]);
			}
		}

		return output;
	}

	/**
	 * @param {("esri/tasks/QueryTask"|"esri/layers/FeatureLayer")} queryTaskOrLayer
	 * @param {number[]} oids
	 * @param {string} displayFieldName
	 * @returns {"dojo/Deferred"}
	 */
	function queryForFeaturesWithMatchingOids(queryTaskOrLayer, oids, displayFieldName) {
		var query = new Query();
		query.objectIds = oids;
		query.outFields = [displayFieldName];
		query.returnGeometry = true;
		var output = null;
		if (queryTaskOrLayer.execute) {
			output = queryTaskOrLayer.execute(query);
		} else if (queryTaskOrLayer.queryFeatures) {
			output = queryTaskOrLayer.queryFeatures(query);
		} else {
			throw new TypeError('The "queryTaskOrLayer" parameter is neither.');
		}

		return output;
	}

	/** @typedef {Object.<string, (FeatureSet|Error[])>} QueryAllFeaturesResult
	 * @property {"esri/tasks/FeatureSet"} featureSet
	 * @property {Error[]} errors
	 */

	/** @typedef {Object.<string, (number|"esri/tasks/FeatureSet"|Error[])>} QueryAllFeaturesProgress
	 * @property {number} queriesCompleted - The number of queries that have been completed (either successfully or unsuccessfully) so far.
	 * @property {number} totalQueries - The total number of queries that will be run. (totalQueries - queriesCompleted = queries remaining)
	 * @property {?"esri/tasks/FeatureSet")} featureSet - If the query was successful, this value will be the resulting FeatureSet. Otherwise it will be null.
	 * @property {?Error} error - If an error occurred this value will be the error. It will be null otherwise.
	 */

	/**
	 * @property {(Layer|"esri/layers/FeatureLayer")} layerInfo
	 * @property {"esri/tasks/QueryTask"} [queryTask=undefined] - This property is only necessary if layerInfo is not a FeatureLayer.
	 * @returns {"dojo/Deferred"}
	 */
	function getAllFeaturesForLayer(layerInfo, queryTask) {
		var query, deferred, idsDeferred;

		var outFeatureSet = null;
		var deferredCompleteCount = 0; // Count of completed deferrred (errors count here, too).
		var errors = null;

		deferred = new Deferred();
		query = new Query();
		query.where = "1=1"; // Return all features.
		idsDeferred = layerInfo.queryIds ? layerInfo.queryIds(query) : (queryTask && queryTask.executeForIds) ? queryTask.executeForIds(query) : null;
		if (!idsDeferred) {
			throw new TypeError("Invalid parameters");
		}
		idsDeferred.then(function (objectIds) {
			// Update deferred's progress.
			deferred.progress("retrieved object ids");
			var oidGroups = breakObjectIdsIntoGroups(objectIds, layerInfo.maxRecordCount);

			/** Resolves the Deferred if all of the queries have been completed. */
			function resolveIfCompleted() {
				if (deferredCompleteCount === oidGroups.length) {
					deferred.resolve({
						featureSet: outFeatureSet,
						errors: errors
					});
				}
			}

			/** Updates the Deferred's progress. */
			function updateProgress(featureSet, error) {
				deferredCompleteCount += 1;
				deferred.progress({
					queriesCompleted: deferredCompleteCount,
					totalQueries: oidGroups.length,
					featureSet: featureSet || null,
					error: error || null
				});
			}

			/** Adds the features from a FeatureSet from a single query to the overall output feature set.
			 * Updates the progress of the Deferred and resolves it if appropriate.
			 * @param {FeatureSet} featureSet
			 */
			function onFeatureQueryComplete(featureSet) {
				updateProgress(featureSet, null);
				if (!outFeatureSet) {
					outFeatureSet = featureSet;
				} else {
					featureSet.features.forEach(function (v) {
						outFeatureSet.features.push(v);
					});
				}
				resolveIfCompleted();
			}

			/** Handles query errors. Updates progress of Deferred and resolves it if appropriate.
			 * @param {Error} err
			 */
			function onFeatureQueryError(err) {
				updateProgress(null, err);
				if (!errors) {
					errors = [err];
				} else {
					errors.push(err);
				}
				resolveIfCompleted();
			}

			// query each set of OID groups for features.
			oidGroups.forEach(function (oids) {
				queryForFeaturesWithMatchingOids(queryTask || layerInfo, oids, layerInfo.displayFieldName || layerInfo.displayField).then(onFeatureQueryComplete, onFeatureQueryError);
			});
		}, function (err) {
			// Call Deferred.Reject if an error has occured getting object IDs.
			deferred.reject(err);
		});

		return deferred;
	}

	/**
	 * Gets a query task for a layer if it is not a feature layer.
	 * @param {("esri/layers/FeatureLayer"|"esri/layers/ArcGISDynamicMapServiceLayer"|"esri/layers/ArcGISTiledMapServiceLayer")} layer
	 * @param {number} [layerId] - This is only required if layer is not a FeatureLayer.
	 * @returns {?"esri/tasks/QueryTask"} A query task is returned if layer is not a feature layer. Feature layers have their own query functions so a query task is not necessary in this case.
	 */
	function getQueryTaskForLayer(layer, layerId) {
		var queryTask = null;

		if (!layer) {
			throw new TypeError("The layer parameter must be provided.");
		} else if (layer.queryFeatures) {
			// Feature layer. No query task needs to be created.
			queryTask = null;
		} else if (layer.capabilities && layer.url && layer.capabilities.contains("Query")) {
			// Create a query task for the first child layer.
			if (!layerId) {
				layerId = 0;
			}
			queryTask = new QueryTask([layer.url.trimRight("/"), layerId].join("/"));
		} else {
			throw new Error("Unsupported layer type.");
		}

		return queryTask;
	}

	return {
		getAllFeaturesForLayer: getAllFeaturesForLayer,
		getLayerInfo: getLayerInfo,
		getQueryTaskForLayer: getQueryTaskForLayer
	};
});