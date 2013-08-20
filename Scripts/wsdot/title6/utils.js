/*global define*/
define(function () {
	"use strict";
	var utils, SCALE_NAME_BLOCK_GROUP = "blockGroup", SCALE_NAME_TRACT = "tract", SCALE_NAME_COUNTY = "county";


	utils = {
		getLevel: function (scale) {
			var output;

			if (scale == null) { // scale is null or undefined.
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
		}
	};

	utils.SCALE_NAME_BLOCK_GROUP = SCALE_NAME_BLOCK_GROUP;
	utils.SCALE_NAME_TRACT = SCALE_NAME_TRACT;
	utils.SCALE_NAME_COUNTY = SCALE_NAME_COUNTY;

	return utils;
});