/*global define*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"dojo/Deferred",
	"esri/request",
	"esri/tasks/QueryTask"
], function (declare, Evented, Deferred, request, QueryTask) {

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

		if (maxRecordCount == null) {
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
			// TODO: query each set of OID groups for features.
		},handleError);
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
				// TODO: Query all features.
			});
		}
	});
});