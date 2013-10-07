/*global define*/
/*jslint nomen:true*/
define(function () {
	"use strict";
	var utils, SCALE_NAME_BLOCK_GROUP = "blockGroup", SCALE_NAME_TRACT = "tract", SCALE_NAME_COUNTY = "county";


	utils = {
		/** Determines the level for the current map scale.
		 * @param {number} [scale=0]
		 * @returns {string} The name of the level.
		 */
		getLevel: function (scale) {
			var output;

			// 
			if (!scale) { // scale is null or undefined.
				scale = 0;
			} else if (typeof scale !== "number") {
				scale = Number(scale);
			}

			if (scale >= 4000000) {
				output = SCALE_NAME_COUNTY;
			} else if (scale >= 500000) {
				output = SCALE_NAME_TRACT;
			} else {
				output = SCALE_NAME_BLOCK_GROUP;
			}
			return output;
		},
		/** Gets an array of currently visible layers in a map.
		 * @returns {esri/layers/Layer[]}
		 */
		getVisibleLayers: function (/** {esri/Map} */ map) {
			var output = [], p, layer;
			for (p in map._layers) {
				if (map._layers.hasOwnProperty(p)) {
					layer = map._layers[p];
					if (layer.visible) {
						output.push(layer);
					}
				}
			}
			return output;
		}
	};

	utils.ranges = {
		county: [499999,0],
		tract: [500000,3999999],
		blockGroup: [0,4000000]
	};

	utils.SCALE_NAME_BLOCK_GROUP = SCALE_NAME_BLOCK_GROUP;
	utils.SCALE_NAME_TRACT = SCALE_NAME_TRACT;
	utils.SCALE_NAME_COUNTY = SCALE_NAME_COUNTY;

	return utils;
});