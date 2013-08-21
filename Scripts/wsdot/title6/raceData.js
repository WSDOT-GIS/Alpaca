﻿/*global define*/
/*jslint nomen:true,plusplus:true,white:true,browser:true*/
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
		var self = this, table, tbody, innerHtml, total, propertyName;

		total = this.getTotal();

		table = document.createElement("table");
		table.createCaption().textContent = "Minority";
		table.createTHead().innerHTML = "<tr><th>Race</th><th>Count</th><th>%</th></tr>";
		tbody = table.createTBody();

		/** Adds a row of data to the innerHTML array.
		*/
		function addRow(/**{String} */ propertyName) {
			var tr, td, label, value, percent;

			label = RaceData.labels[propertyName];
			value = self[propertyName];
			percent = Math.round((value / total) * 10000) / 100;

			tr = document.createElement("tr");

			td = document.createElement("td");
			td.textContent = label;
			tr.appendChild(td);

			td = document.createElement("td");
			td.textContent = value;
			tr.appendChild(td);

			td = document.createElement("td");
			td.textContent = [percent, "%"].join("");
			tr.appendChild(td);

			table.appendChild(tr);
		}

		for (propertyName in self) {
			if (self.hasOwnProperty(propertyName)) {
				if (RaceData.labels.hasOwnProperty(propertyName)) {
					addRow(propertyName);
				}
			}
		}

		return table;
	};



	return RaceData;
});