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
		 * @param {("esri/layers/FeatureLayer"|"esri/layers/ArcGISDynamicMapServiceLayer"|"esri/layers/ArcGISTiledMapServiceLayer")} layer
		 * @param {?number} [layerId] - Sub-layer ID. This is only required if layer is NOT a FeatureLayer.
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

				function getName(attributes, displayFieldName) {
					var name = attributes[displayFieldName];
					// If for some reason the display name doesn't actually have a corresponding attribute, try a case insensitive search.
					var displayNameRe, firstString;
					if (!name) {
						displayNameRe = new RegExp(displayFieldName, "i");
						for (var fieldName in attributes) {
							if (displayNameRe.test(fieldName)) {
								name = attributes[fieldName];
								break;
							} else if (!firstString && typeof attributes[fieldName] === "string") {
								firstString = attributes[fieldName];
							}
						}
					}
					// If the case insensitive search also failed, use the first string property as the name.
					if (!name && firstString) {
						name = firstString;
					}
					return name;
				}

				/**
				 * Populates the select element with options corresponding to the result feature set.
				 * @param {Object.<string, ("esri/tasks/FeatureSet"|Error)>} result
				 * @param {"esri/tasks/FeatureSet"} result.featureSet
				 * @param {Error[]} result.errors
				 */
				function populateSelect(result) {
					var featureSet = result.featureSet;
					var frag = document.createDocumentFragment();
					var options = featureSet.features.map(function (feature) {
						var option = document.createElement("option");
						var displayFieldName = layerInfo.displayFieldName || layerInfo.displayField;
						var name = getName(feature.attributes, displayFieldName);

						option.textContent = name;
						option.value = JSON.stringify(feature.geometry.toJson());
						return option;
					});
					options.sort(function (a, b) {
						return a.textContent > b.textContent ? 1 : a.textContent < b.textContent ? -1 : 0;
					});
					options.forEach(function (option) {
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