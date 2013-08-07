Title VI Map Application
========================

## Chart Data Provider ##

* There is one map service per chart. While only one of these map services will be displayed at a time on the map, the charts for all will be displayed at all times. (Charts may be hidden by Dojo controls, but chart visibility is not dependant on the corresponding layer's visibility in the map.)
	* Language
	* Minority
* Each map service contains three sublevels.  Each only one sublevel is visible at a time, depending on the map's zoom level. Each map service's chart will be updated as the zoom level changes in the map.
	* Block Group (up to 499,999)
	* Tract (500,000 - 3,999,999)
	* County (4,000,000 and up)

### Filtering by geometry ###

The user can select a service area by drawing it on the map.

## License ##
See the `LICENSE` file for details.