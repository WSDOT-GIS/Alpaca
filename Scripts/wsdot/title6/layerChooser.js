/*global define*/
/*jslint browser:true,plusplus:true*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"dojo/on",
	"dijit/form/HorizontalSlider",
	"esri/dijit/Legend"
], function (declare, Evented, on, HorizontalSlider, Legend) {
	"use strict";
	var LayerChooser, LayerRadioButton, SublayerList;

	SublayerList = declare([Evented], {
		/** @property {HTMLUListElement} */
		domNode: null,
		constructor: function (layer) {
			var self = this, i, l, layerInfos, layerInfo, li, radioButton, label, clickHandler;

			clickHandler = function() {
				var sublayerIds = this.value.split(",").map(function (v) {
					return parseInt(v, 10);
				});
				layer.setVisibleLayers(sublayerIds);
				self.emit("sublayer-select", {
					layer: layer,
					sublayerIds: sublayerIds
				});
			};

			layerInfos = layer.layerInfos;
			self.domNode = document.createElement("ul");
			for (i = 0, l = layerInfos.length; i < l; i += 1) {
				layerInfo = layerInfos[i];
				if (layerInfo.parentLayerId === -1) {
					li = document.createElement("li");
					self.domNode.appendChild(li);
					// create the radio button.
					radioButton = document.createElement("input");
					radioButton.id = ["layer", layer.id, layerInfo.id, "radio_button"].join("_");
					radioButton.name = [layer.id, "sublayers"].join("_");
					radioButton.type = "radio";
					radioButton.checked = layerInfo.defaultVisibility;
					radioButton.value = [layerInfo.id].concat(layerInfo.subLayerIds); // The value will be converted to a string.
					li.appendChild(radioButton);
					// Create label
					label = document.createElement("label");
					label.htmlFor = radioButton.id;
					label.textContent = layerInfo.name;
					li.appendChild(label);
					radioButton.addEventListener("click", clickHandler);
				}
			}
		}
	});

	LayerRadioButton = declare([Evented], {
		radioButton: null,
		label: null,
		domNode: null,
		sublayerList: null,
		opacitySlider: null,
		legend: null,
		/**
		@param {Object} options
		@param {Object} options.operationalLayer
		@param {esri/layers/Layer} options.operationalLayer.layerObject
		@param {String} options.operationalLayer.id
		@param {String} options.operationalLayer.title
		@param {Array} options.operationalLayer.errors
		@param {Boolean} [options.checked] Is the radio button checked?
		@param {Boolean} [options.includeSublayers] 
		@constructs
		*/
		constructor: function (options) {
			var self = this, opLayer = options.operationalLayer, legendDiv;

			self.domNode = document.createElement("li");

			// Radio button
			self.radioButton = document.createElement("input");
			self.radioButton.type = "radio";
			self.radioButton.id = ["layer_chooser_radio_", opLayer.layerObject.id].join("");
			self.radioButton.value = opLayer.id;
			self.radioButton.name = "layer_chooser";
			if (options.checked) {
				self.radioButton.checked = true;
			}
			self.domNode.appendChild(self.radioButton);

			// Label
			self.label = document.createElement("label");
			self.label.htmlFor = self.radioButton.id;
			self.label.textContent = opLayer.title;

			self.domNode.appendChild(self.label);

			on(self.radioButton, "click", function () {
				self.emit("checked", {
					id: self.radioButton.value,
					visible: self.radioButton.checked
				});
			});

			// If the layer has errors, disable the radio button
			if (opLayer.errors && opLayer.errors.length) {
				self.radioButton.disabled = true;
				self.domNode.classList.add("layer-chooser-layer-error");
			}

			// Add the opacity slider

			self.opacitySlider = new HorizontalSlider({
				value: opLayer.layerObject.opacity,
				minimum: 0,
				maximum: 1,
				onChange: function (value) {
					opLayer.layerObject.setOpacity(value);
				}
			});

			self.domNode.appendChild(self.opacitySlider.domNode);


			
			if (options.includeSublayers) {
				self.sublayerList = new SublayerList(opLayer.layerObject);
				self.domNode.appendChild(self.sublayerList.domNode);
				self.sublayerList.on("sublayer-select", function (e) {
					self.emit("sublayer-select", e);
				});
			}

			// Create the legend...
			legendDiv = document.createElement("div");
			legendDiv.classList.add("layer-chooser-legend");
			self.domNode.appendChild(legendDiv);
			self.legend = new Legend({
				autoUpdate: true,
				map: options.map,
				layerInfos: [
					{
						layer: opLayer.layerObject,
						title: opLayer.title
					}
				]
			}, legendDiv);
		}
	});

	LayerChooser = declare([Evented], {
		domNode: null,
		map: null,
		toggleLayer: function() {
			var qs, i, l, rb, layer;

			// Select all of the radio buttons.
			qs = this.domNode.querySelectorAll('input[name=layer_chooser]');

			// For each radio button, set the visibility based on whether or not the radio is checked.
			for (i = 0, l = qs.length; i < l; i += 1) {
				rb = qs.item(i);
				layer = this.map.getLayer(rb.value);
				if (layer) {
					if (rb.checked) {
						layer.show();
					} else {
						layer.hide();
					}
				}
			}
		},
		list: null,
		/**
		* @param mapInfo The response of the arcgisUtils/createMap operation. See https://developers.arcgis.com/en/javascript/jshelp/intro_webmap.html
		* @param {esri/Map} mapInfo.map
		* @param {Object} mapInfo.itemInfo
		* @param {Object} mapInfo.itemInfo.itemData
		* @param {Object} mapInfo.itemInfo.itemData.baseMap
		* @param {Array} mapInfo.itemInfo.itemData.operationalLayers
		* @param {Object} mapInfo.clickEventHandle
		* @param {Object} mapInfo.clickEventListener
		* @param {Array} mapInfo.errors
		* @constructs
		*/
		constructor: function (mapInfo, domRef) {
			var self = this, operationalLayers, i, layerRadio, opLayer, firstLayerFound = false;

			function toggleLayer() {
				self.toggleLayer();
			}

			function emitSublayerEvent(e) {
				self.emit("sublayer-select", e);
			}

			// Determine the root element from this dijit.
			if (!domRef) {
				throw new Error("The domRef parameter was not provided.");
			} else if (typeof domRef === "string") {
				this.domNode = document.getElementById(domRef);
			} else {
				this.domNode = domRef;
			}

			self.list = document.createElement("ul");
			self.list.classList.add("layer-list");
			self.domNode.appendChild(self.list);

			this.map = mapInfo.map;
			operationalLayers = mapInfo.itemInfo.itemData.operationalLayers;

			// Create the radio buttons and place each into a document fragment as it is created.

			//for (i = 0, l = operationalLayers.length; i < l; i += 1) {
			for (i = operationalLayers.length - 1; i >= 0; i--) {
				opLayer = operationalLayers[i];

				layerRadio = new LayerRadioButton({
					operationalLayer: opLayer,
					map: self.map,
					//layerId: opLayer.id,
					//label: opLayer.title,
					checked: !firstLayerFound, // Only check the first valid layer's radio button.
					//errors: opLayer.errors
					includeSublayers: !/^(?:Boundaries)|(?:Minority)$/i.test(opLayer.title)
				});

				layerRadio.on("checked", toggleLayer);
				layerRadio.on("sublayer-select", emitSublayerEvent);

				if (!(opLayer.errors && opLayer.errors.length)) {
					// Show the first layer, hide the others.
					if (!firstLayerFound) {
						opLayer.layerObject.show();
						firstLayerFound = true;
					} else {
						opLayer.layerObject.hide();
					}
				}

				self.list.appendChild(layerRadio.domNode);
				layerRadio.legend.startup();
			}
		}
	});

	return LayerChooser;
});