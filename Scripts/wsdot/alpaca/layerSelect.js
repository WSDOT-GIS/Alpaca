/*global define*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"dojo/Deferred",
	"esri/request",
	"esri/tasks/QueryTask",
	"esri/tasks/Query"
], function (declare, Evented, Deferred, request, QueryTask, Query) {

	/**
	 * @typedef {Object} LayerInfo
	 * @property {number} maxRecordCount
	 * @property {string} objectIdField
	 * @property {Field[]} fields
	 * @property {string} displayField
	 */

	/**
	 * Gets information about a layer.
	 * @param {(string|esri/layer/FeatureLayer)} urlOrFeatureLayer - Either the URL to a feature layer or a FeatureLayer object.
	 * @returns {dojo/Deferred}
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
	 * @param {(QueryTask|FeatureLayer)} queryTaskOrLayer
	 * @param {number[]} oids
	 * @param {string} displayField
	 * @returns {dojo/Deferred}
	 */
	function queryForFeaturesWithMatchingOids(queryTaskOrLayer, oids, displayField) {
		var query = new Query();
		query.objectIds = oids;
		query.outFields = [displayField];
		query.returnGeometry = true;
		return queryTaskOrLayer.execute ?
			queryTaskOrLayer.execute(query)
			: queryTaskOrLayer.queryFeatures ? queryTaskOrLayer.queryFeatures(query)
			: null;
	}

	/**
	 * @property {(LayerInfo|FeatureLayer)} layerInfo
	 * @property {QueryTask} [queryTask=undefined] - This property is only necessary if layerInfo is not a FeatureLayer.
	 * @returns {dojo/Deferred}
	 */
	function getAllFeaturesForLayer(layerInfo, queryTask) {
		var query, deferred, idsDeferred;

		/** Reject the output deferred object. */
		function handleError(err) {
			deferred.reject(err);
		}

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
			deferred.progress("retrieved object ids");
			var oidGroups = breakObjectIdsIntoGroups(objectIds, layerInfo.maxRecordCount);

			function resolveIfCompleted() {
				if (deferredCompleteCount === oidGroups.length) {
					deferred.resolve({
						featureSet: outFeatureSet,
						errors: errors
					});
				}
			}

			function updateProgress(featureSet, error) {
				deferredCompleteCount += 1;
				deferred.progress({
					queriesCompleted: deferredCompleteCount,
					totalQueries: oidGroups.length,
					featureSet: featureSet || null,
					error: error || null
				});
			}

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
				queryForFeaturesWithMatchingOids(queryTask || layerInfo, oids, layerInfo.displayField).then(onFeatureQueryComplete, onFeatureQueryError);
			});
		},handleError);

		return deferred;
	}

	return declare([Evented], {
		select: null,
		queryTask: null,
		layer: null,
		/**
		 * @param {(HTMLSelectElement|string)} domNode - Either an HTMLSelectElement or the "id" attribute of a select element.
		 * @param {esri/layers/Layer} layer
		 * @constructs
		 * @throws {TypeError} Thrown if domNode is an invalid type.
		 */
		constructor: function (domNode, layer) {
			var self = this;
			// Setup the this.select property.
			if (domNode) {
				if (typeof domNode === "string") {
					this.select = document.getElementById(domNode);
				} else if (domNode instanceof HTMLSelectElement) {
					this.select = domNode;
				}
			}
			// Throw an error if select was not valid.
			if (!this.select) {
				throw new TypeError("The domNode must be either an HTMLSelectElement or the id of one.");
			}

			if (!layer) {
				throw new TypeError("The layer parameter must be provided.");
			} else if (layer.queryFeatures) {
				// Feature layer. No query task needs to be created.
				this.layer = layer;
				this.queryTask = null;
			} else if (layer.capabilities && layer.url && layer.capabilities.contains("Query")){
				// Store layer (may not actually be necessary for this layer type).
				this.layer = layer;
				// Create a query task for the first child layer.
				this.queryTask = new QueryTask([layer.url.trimRight("/"), "0"].join("/"));
			}

			getLayerInfo(this.queryTask ? this.queryTask.url : this.layer).then(function (layerInfo) {
				function populateSelect(result) {
					var featureSet = result.featureSet;
					var frag = document.createDocumentFragment();
					featureSet.features.forEach(function (feature) {
						var option = document.createElement("option");
						option.textContent = feature.attributes[layerInfo.displayField];
						option.value = JSON.stringify(feature.geometry.toJson());
						frag.appendChild(option);
					});
					self.select.appendChild(frag);
				}

				// Query all features. Populate the select element with corresponding options.
				getAllFeaturesForLayer(layerInfo, self.queryTask).then(populateSelect);
			});
		}
	});
});