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
		featureSet: null,
		/** Gets the feature from the featureSet.features array at the specified position.
		 * @param {number} id
		 * @returns {"esri/Graphic"}
		 */
		getFeatureById: function(id) {
			return this.featureSet.features[id];
		},
		/**
		 * Returns the graphic corresponding to the currently selected option.
		 * @returns {"esri/Graphic"}
		 */
		getSelectedFeature: function() {
			var selectedIndex = this.select.selectedIndex;
			var option = this.select.options[selectedIndex];
			var id = option.value;
			var output = null;
			/*jshint eqnull:true*/
			if (id != null) {
				output = this.getFeatureById(id);
			}
			/*jshint eqnull:false*/
			return output;

		},
		/**
		 * @param {(HTMLSelectElement|string)} domNode - Either an HTMLSelectElement or the "id" attribute of a select element.
		 * @param {(string|"esri/layers/FeatureLayer"|"esri/layers/ArcGISDynamicMapServiceLayer"|"esri/layers/ArcGISTiledMapServiceLayer")} layer - Either a layer object or the URL of a feature layer.
		 * @param {?number} [layerId] - Sub-layer ID. This is only required if layer is NOT a FeatureLayer.
		 * @constructs
		 * @throws {TypeError} Thrown if domNode is an invalid type.
		 */
		constructor: function (domNode, layer, layerId) {
			var self = this;

			function emitChangeEvent() {
				var feature, event;
				feature = self.getSelectedFeature();

				self.emit("feature-select", feature);
				if (CustomEvent) {
					try {
						event = new CustomEvent("featureselect", {
							detail: {
								feature: feature
							}
						});
						self.select.dispatchEvent(event);
					} catch (e) {
						if (!(e instanceof TypeError)) {
							throw e;
						}
					}

				}
			}

			var featureLayerUrlRe = /https?\:\/\/.+\/MapServer\/\d+\/?/i;
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
				this.queryTask = new QueryTask([layer.url.replace(/\/$/, ""), layerId || "0"].join("/"));
			} else if (typeof layer === "string") {
				if (featureLayerUrlRe.test(layer)) {
					this.queryTask = new QueryTask(layer);
				} else {
					throw new TypeError("If the \"layer\" parameter is a string then it must be a valid URL for a map service layer or a feature service");
				}
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
					self.featureSet = result.featureSet;
					var frag = document.createDocumentFragment();

					// TODO: Check for error. The error property will have a value, featureSet will not.

					// Sort features by name.
					self.featureSet.features.sort(function (featureA, featureB) {
						var nameA = getName(featureA.attributes), nameB = getName(featureB.attributes);
						return nameA > nameB ? 1 : nameB > nameA ? -1 : 0;
					});
					self.featureSet.features.forEach(function (feature, i) {
						var option = document.createElement("option");
						var displayFieldName = result.featureSet.displayFieldName;
						var name = getName(feature.attributes, displayFieldName);

						option.textContent = name;
						option.value = i; // JSON.stringify(feature.geometry.toJson());
						frag.appendChild(option);
					});
					self.select.appendChild(frag);

					var event;

					// Fire the dojo/Evented event.
					self.emit("features-loaded", result);

					self.select.addEventListener("change", emitChangeEvent);

					// Fire custom (standard HTML element) event for the select element.
					if (window.CustomEvent) {
						try {
							event = new CustomEvent("featuresloaded", {
								detail: {
									result: result
								}
							});
						} catch (e) {
							if (!(e instanceof TypeError)) {
								throw e;
							}
						}
						if (event) {
							self.select.dispatchEvent(event);
						}
					}
				}

				// Query all features. Populate the select element with corresponding options.
				queryUtils.getAllFeaturesForLayer(layerInfo, self.queryTask).then(populateSelect);

			});
		}
	});
});