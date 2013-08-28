/*global define*/
/*jslint browser:true*/
define(["dojo/_base/declare", "dojo/on"], function (declare, on) {
	"use strict";

	var ListItem, GraphicsLayerList;

	/** Generates a string that can be used for a DOM element's id.
	 * @param {string} [prefix=id] The prefix that will be appended to the result of Date.now().
	 * @returns {string}
	 */
	function generateUniqueId(prefix) {
		if (!prefix) {
			prefix = "id";
		}

		return [prefix, Date.now()].join("");

	}

	ListItem = declare(null, {
		domNode: null,
		layer: null,
		checkbox: null,
		label: null,
		removeButton: null,
		/** @constructs */
		constructor: function (/** {!(string|esri/layers/GraphicsLayer)} */ layer) {
			var id;
			id = generateUniqueId();

			if (!layer) {
				throw new TypeError("The layer parameter must be an esri/layers/Layer.");
			}

			this.layer = layer;

			this.domNode = document.createElement("li");
			this.domNode.setAttribute("data-layer-id", layer.id);

			this.checkbox = document.createElement("input");
			this.checkbox.setAttribute("data-layer-id", layer.id);
			this.checkbox.type = "checkbox";
			this.checkbox.id = id;
			this.checkbox.checked = layer.visible;
			this.domNode.appendChild(this.checkbox);

			this.label = document.createElement("label");
			this.label.htmlFor = id;
			this.label.textContent = layer.id;
			this.domNode.appendChild(this.label);

			this.removeButton = document.createElement("button");
			this.removeButton.setAttribute("data-layer-id", layer.id);
			this.removeButton.type = "button";
			this.removeButton.textContent = "remove";

			this.domNode.appendChild(this.removeButton);
		}
	});

	GraphicsLayerList = declare(null, {
		/** @member {HTMLLIElement} */
		domNode: null,
		/** @member {esri/Map} */
		map: null,
		/** Gets the LayerItem corresponding to the given layer 
		 * @param {!(esri/layers/Layer|string)} layer Either a Layer object or the id of a graphics layer.
		 */
		getLIForLayer: function (layer) {
			var li, layerId;

			layerId = (typeof layer === "string") ? layer : layer && layer.id ? layer.id : null;

			li = this.domNode.querySelector("[data-layer-id='" + layerId + "']");

			return li;
		},
		/**
		 * @param {esri/Map} map
		 * @param {(HTMLUListElement|HTMLOListElement|string)} [domNode]
		 * @param {Object} options
		 * @param {Regexp} [options.omittedLayers] Determines which layers will be omitted from the layer list.
		 * @constructs
		 */
		constructor: function (map, domNode, options) {
			var self = this, i, l, id, layer, listItem, frag, removeLayerFromMap, setLayerVisibility;

			/** Determines if a layer should be omitted from the layer list.
			 * @returns {boolean}
			*/
			function shouldOmit(/** {string} */ layer) {
				var id, output;
				if (!options || !options.omittedLayers) {
					output = false;
				} else {
					if (!layer) {
						throw new TypeError("Layer must be either a string or a layer object.");
					} else if (typeof layer === "string") {
						id = layer;
					} else if (layer.id) {
						id = layer.id;
					} else {
						throw new TypeError("Layer must be either a string or a layer object.");
					}
					output = options.omittedLayers.test(id);
				}
				return output;
			}



			/** Removes the layer from the map that corresponds to the button that was clicked.
			 * @this {HTMLButtonElement}
			 */
			removeLayerFromMap = function () {
				var layer;

				layer = this.getAttribute("data-layer-id");
				if (layer) {
					layer = map.getLayer(layer);
					if (layer) {
						map.removeLayer(layer);
					}
				}
			};

			/** Sets the visibility of the layer associated with the checkbox.
			 * @this {HTMLInputElement} A checkbox input element.
			 */
			setLayerVisibility = function () {
				var layer;

				layer = this.getAttribute("data-layer-id");
				if (layer) {
					layer = map.getLayer(layer);
					if (layer) {
						if (this.checked) {
							layer.show();
						} else {
							layer.hide();
						}
					}
				}
			};

			/** Creates a list item and assignes its removeButton and checkbox events.
			 * @returns {ListItem}
			*/
			function createListItem(/**{esri/layers/Layer}*/ layer) {
				var listItem;
				listItem = new ListItem(layer);
				on(listItem.removeButton, "click", removeLayerFromMap);
				on(listItem.checkbox, "change", setLayerVisibility);

				return listItem;
			}

			if (!map) {
				throw new TypeError("The map parameter cannot be null.");
			}
			if (!domNode) {
				domNode = document.createElement("ul");
			} else if (typeof domNode === "string") {
				domNode = document.getElementById(domNode);
			}

			this.domNode = domNode;

			this.domNode.classList.add("graphics-layer-list");

			frag = document.createDocumentFragment();

			for (i = 0, l = map.graphicsLayerIds.length; i < l; i += 1) {
				id = map.graphicsLayerIds[i];
				if (!shouldOmit(id)) {
					layer = map.getLayer(id);
					listItem = createListItem(layer);
					frag.appendChild(listItem.domNode);
				}
			}

			this.domNode.appendChild(frag);

			/**
			 * @param evt
			 * @param {esri/layers/Layer} evt.layer The removed layer.
			 * @this {esri/Map}
			 */
			map.on("layer-remove", function (evt) {
				var li = self.getLIForLayer(evt.layer);
				if (li) {
					self.domNode.removeChild(li);
				}
			});

			/**
			 * @param evt
			 * @param {esri/layers/Layer} evt.layer The layer that was added to the Map
			 * @param {(Error|null)} evt.error An optional parameter. The value of this parameter will a standard JavaScript Error object if an error occurred or null if the layer was added successfully.
			 * @this {esri/Map}
			 */
			map.on("layer-add-result", function (evt) {
				var listItem;
				if (evt.layer && !shouldOmit(evt.layer.id)) {
					listItem = createListItem(evt.layer);
					// Add the list item to the list.
					self.domNode.appendChild(listItem.domNode);
				}
			});
		}
	});

	GraphicsLayerList.ListItem = ListItem;

	return GraphicsLayerList;
});