/*global define*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"dojo/Deferred",
	"esri/request",
	"esri/tasks/QueryTask",
	"esri/tasks/query",
	"../queryUtils"
], function (declare, Evented, Deferred, request, QueryTask, Query, queryUtils) {
	
	return declare([Evented], {
		select: null,
		queryTask: null,
		layer: null,
		/**
		 * @param {(HTMLSelectElement|string)} domNode - Either an HTMLSelectElement or the "id" attribute of a select element.
		 * @param {"esri/layers/Layer"} layer
		 * @param {?number} [layerId]
		 * @constructs
		 * @throws {TypeError} Thrown if domNode is an invalid type.
		 */
		constructor: function (domNode, layer, layerId) {
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
			} else if (layer.url) { // layer.capabilities && layer.url && layer.capabilities.contains("Query")){
				// Store layer (may not actually be necessary for this layer type).
				this.layer = layer;
				// Create a query task for the first child layer.
				this.queryTask = new QueryTask([layer.url.trimRight("/"), layerId || "0"].join("/"));
			}

			queryUtils.getLayerInfo(this.queryTask ? this.queryTask.url : this.layer).then(function (layerInfo) {

				/**
				 * Populates the select element with options corresponding to the result feature set.
				 * @param {Object.<string, ("esri/tasks/FeatureSet"|Error)>} result
				 * @param {"esri/tasks/FeatureSet"} result.featureSet
				 * @param {Error[]} result.errors
				 */
				function populateSelect(result) {
					var featureSet = result.featureSet;
					var frag = document.createDocumentFragment();
					featureSet.features.forEach(function (feature) {
						var option = document.createElement("option");
						option.textContent = feature.attributes[layerInfo.displayFieldName || layerInfo.displayField];
						option.value = JSON.stringify(feature.geometry.toJson());
						frag.appendChild(option);
					});
					self.select.appendChild(frag);

					var event;

					// Fire custom (standard HTML element) event for the select element.
					if (window.CustomEvent) {
						event = new CustomEvent("featuresloaded", {
							detail: {
								result: result
							}
						});
						self.select.dispatchEvent(event);
					}
					// Fire the dojo/Evented event.
					self.emit("featuresloaded", result);
				}

				// Query all features. Populate the select element with corresponding options.
				queryUtils.getAllFeaturesForLayer(layerInfo, self.queryTask).then(populateSelect);

			});
		}
	});
});