/*global define*/
/*jslint nomen:true,plusplus:true*/
define(function () {
	"use strict";

	function RaceData(/**{Object}*/ queryResults) {
		this.white = queryResults.SUM_White || queryResults.white || 0;
		this.minority = queryResults.SUM_NotWhite || queryResults.minority || 0;
		this.oneRace = queryResults.SUM_OneRace || queryResults.oneRace || 0;
		this.marginOfError = queryResults.marginOfError || {
			white: queryResults.MAX_MEWhite,
			oneRace: queryResults.MAX_MEOneRace,
			total: queryResults.MAX_METotal
		};
	}

	RaceData.labels = {
		white: "White",
		minority: "Minority"
	};

	RaceData.prototype.getTotal = function () {
		return this.white + this.minority;
	};

	RaceData.prototype.toPieChartSeries = function () {
		var race, item, output = [], total, label;

		total = this.getTotal();

		for (race in RaceData.labels) {
			if (RaceData.labels.hasOwnProperty(race)) {
				label = RaceData.labels[race];
				item = {
					y: this[race],
					text: label,
					fill: race === "white" ? "RGB(255,235,204)" : "RGB(240,118,5)",
					stroke: "black",
					tooltip: [label, ": (~", Math.round((this[race] / total) * 10000) / 100, "%)"].join("")
				};
				output.push(item);
			}
		}

		return output;
	};

	RaceData.prototype.toHtmlTable = function () {
		var self = this, table, innerHtml, total, propertyName;

		total = this.getTotal();

		table = document.createElement("table");

		innerHtml = ["<thead><tr><th>Race</th><th>Count</th><th>%</th></tr></thead><tbody>"];

		/** Adds a row of data to the innerHTML array.
		*/
		function addRow(/**{String} */ propertyName) {
			var label = RaceData.labels[propertyName], value = self[propertyName], percent = Math.round((value / total) * 10000) / 100;
			innerHtml.push("<tr>",
				"<td>", label, "</td>",
				"<td>", value, "</td>",
				"<td>", percent, " %</td>",
			"</tr>");
		}

		for (propertyName in self) {
			if (self.hasOwnProperty(propertyName)) {
				if (RaceData.labels.hasOwnProperty(propertyName)) {
					addRow(propertyName);
				}
			}
		}


		innerHtml.push("</tbody>");
		table.innerHTML = innerHtml.join("");
		return table;
	};



	return RaceData;
});