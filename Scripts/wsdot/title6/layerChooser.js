define([
	"dojo/_base/declare",
	"dojo/Evented",
	"dojo/on"
], function (declare, Evented, on) {
	var LayerChooser, LayerRadioButton;

	LayerRadioButton = declare([Evented], {
		radioButton: null,
		label: null,
		domNode: null,
		/**
		@param options
		@param {String} options.layerId The ID of the layer used to identify it in the map.
		@param {String} options.label The text that will be used for the label.
		@param {Boolean} [options.checked] Is the radio button checked?
		@constructs
		*/
		constructor: function (options) {
			var self = this;

			self.domNode = document.createElement("div");

			// Radio button
			self.radioButton = document.createElement("input");
			self.radioButton.type = "radio";
			self.radioButton.id = ["layer_chooser_radio_", options.layerId].join("");
			self.radioButton.value = options.layerId;
			self.radioButton.name = "layer_chooser";
			if (options.checked) {
				self.radioButton.checked = true;
			}
			self.domNode.appendChild(self.radioButton);

			// Label
			self.label = document.createElement("label");
			self.label.htmlFor = self.radioButton.id;
			self.label.innerText = options.label;

			self.domNode.appendChild(self.label);

			on(self.radioButton, "click", function () {
				self.emit("checked", {
					id: self.radioButton.value,
					visible: self.radioButton.checked
				});
			});
		}
	});

	LayerChooser = declare([Evented], {
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
		constructor: function (mapInfo, domRef) {
			var self = this, operationalLayers, i, l, layerRadio, opLayer, docFrag;

			function toggleLayer(layerInfo) {
				self.toggleLayer();
			}

			// Determine the root element from this dijit.
			if (!domRef) {
				throw new Error("The domRef parameter was not provided.");
			} else if (typeof domRef === "string") {
				this.domNode = document.getElementById(domRef);
			} else {
				this.domNode = domRef;
			}

			this.map = mapInfo.map;
			operationalLayers = mapInfo.itemInfo.itemData.operationalLayers;

			// Create the radio buttons and place each into a document fragment as it is created.
			docFrag = document.createDocumentFragment();

			for (i = 0, l = operationalLayers.length; i < l; i += 1) {
				opLayer = operationalLayers[i];
				layerRadio = new LayerRadioButton({
					layerId: opLayer.id,
					label: opLayer.title,
					checked: i === 0
				});

				layerRadio.on("checked", toggleLayer);

				// Show the first layer, hide the others.
				if (i === 0) {
					opLayer.layerObject.show();
				} else {
					opLayer.layerObject.hide();
				}

				docFrag.appendChild(layerRadio.domNode);
			}

			this.domNode.appendChild(docFrag);
		}
	});

	return LayerChooser;
});