/*global define*/
/*jslint browser:true*/
define(["dojo/_base/declare"], function (declare) {
	"use strict";

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

	var ListItem = declare({
		domNode: null,
		layer: null,
		checkbox: null,
		label: null,
		removeButton: null,
		/** @constructs */
		constructor: function (/** {esri/layers/GraphicsLayer} */ layer) {
			var id;
			id = generateUniqueId();

			this.domNode = document.createElement("li");
			this.domNode.setAttribute("data-layer-id", layer.id);

			this.checkbox = document.createElement("input");
			this.checkbox.type = "checkbox";
			this.checkbox.id = id;

			this.domNode.appendChild(this.checkbox);
			this.label = document.createElement("label");
			this.label.htmlFor = id;
			this.label.textContent = layer.id;
			this.domNode.appendChild(this.label);

			this.removeButton = document.createElement("button");
			this.removeButton.type = "button";
			this.domNode.appendChild(this.removeButton);
		}
	});

	return declare({
		/** @member {HTMLLIElement} */
		domNode: null,
		/** @member {esri/Map} */
		map: null,
		/** Gets the LayerItem corresponding to the given layer 
		 * @param {esri/layers/Layer} layer
		 */
		getLIForLayer: function (layer) {
			var li;
			li = this.domNode.querySelector("[data-layer-id=" + layer.id + "]");
			return li;
		},
		/**
		 * @param {esri/Map} map
		 * @param {(HTMLUListElement|string)} [domNode]
		 * @constructs
		 */
		constructor: function (map, domNode) {
			var self = this, i, l, id, layer, listItem, frag;

			if (!map) {
				throw new TypeError("The map parameter cannot be null.");
			}
			if (!domNode) {
				domNode = document.createElement("ul");
			} else if (typeof domNode === "string") {
				domNode = document.getElementById(domNode);
			}

			this.domNode = domNode;

			frag = document.createDocumentFragment();

			for (i = 0, l = map.graphicsLayerIds.length; i < l; i += 1) {
				id = map.graphicsLayerIds[i];
				layer = map.getLayer(id);
				listItem = new ListItem(layer);
				frag.appendChild(listItem.domNode);
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
				if (evt.layer) {
					listItem = new ListItem(evt.layer);
					// Add the list item to the list.
					self.domNode.appendChild(listItem.domNode);
				}
			});
		}
	});
});