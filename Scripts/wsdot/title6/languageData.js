/*global define*/
/*jslint nomen:true,plusplus:true*/
define(["dojo/number"], function (number) {
	"use strict";

	function LanguageData(/**{Object}*/ queryResults) {
		this.english = queryResults.SUM_English;
		this.spanish = queryResults.SUM_Spanish;
		this.indoEuropean = queryResults.SUM_Indo_European;
		this.asianPacificIsland = queryResults.SUM_Asian_PacificIsland;
		this.other = queryResults.SUM_Other;
	}

	LanguageData.labels = {
		english: "English",
		spanish: "Spanish",
		indoEuropean: "Indo / European",
		asianPacificIsland: "Asian / Pacific Island",
		other: "Other"
	};

	/** Returns the total number of people.
	 * @returns {Number}
	 */
	LanguageData.prototype.getTotal = function () {
		return this.english + this.spanish + this.indoEuropean + this.asianPacificIsland + this.other;
	};

	/** Returns the number of people in the largest non-English group.
	 * @returns {Number}
	 */
	LanguageData.prototype.getMaxNotEnglish = function () {
		return Math.max(this.spanish, this.indoEuropean, this.asianPacificIsland, this.other);
	};

	/** Returns the zoom scale integer for DojoX chart zooming to make non-English columns visible in the chart.
	 * @returns {Number}
	 */
	LanguageData.prototype.getNotEnglishZoomScale = function () {
		return this.getTotal() / this.getMaxNotEnglish() - 10;
	};

	/** Determines if the threshold has been met for a particular language.
	 * @param {String} language The name of one of the language properties: "english", "spanish", "indoEuropean", "asianPacificIsland", "other".
	 * @returns {Boolean} If language is "english" or an invalid property name, false will be returned. Returns true if the number of speakers of the language is greater than 1000 or is greater than 5% of the total population.
	 */
	LanguageData.prototype.thresholdMet = function (language) {
		var total, thresholdMet = false, speakerCount;
		// Get the total number of people.
		if (this.hasOwnProperty(language) && language !== "english") {
			total = this.english + this.spanish + this.indoEuropean + this.asianPacificIsland + this.other;
			speakerCount = this[language];
			if (speakerCount > 1000 || speakerCount / total > 0.05) {
				thresholdMet = true;
			}
		}
		return thresholdMet;
	};

	LanguageData.prototype.toColumnChartSeries = function () {
		var language, output = [], item, label, percent, total, speakerCount;
		total = this.getTotal();
		for (language in LanguageData.labels) {
			if (LanguageData.labels.hasOwnProperty(language)) {
				label = LanguageData.labels[language];
				speakerCount = this[language];
				percent = Math.round((speakerCount / total) * 10000) / 100;
				item = {
					y: speakerCount,
					text: label,
					stroke: "black",
					fill: this.thresholdMet(language) ? "#FF0000" : "#FFBEBE",
					tooltip: [label, ": ", number.format(speakerCount), "(~", percent, "%)"].join("")
				};
				output.push(item);
			}
		}
		return output;
	};

	return LanguageData;
});