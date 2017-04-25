GTFS-Service
============

A web service that provides information from GTFS feeds as JSON.

## Setup ##

### Clone the repository ###
To clone the repository. Type `git clone --recursive https://github.com/WSDOT-GIS/GTFS-Service.git` at the git bash prompt.

### Setup reference paths ###
You need to add a reference path in order to get the *Gtfs.IO* project to compile in this solution. **(If someone knows of a way to setup the project so that this isn't necessary, please let me know or create a pull request.)**

* Open the *Gtfs.IO* project properties dialog.
* Click on *Reference Paths*
* Add a reference to `\packages\CsvHelper.2.2.2\lib\netcore45\`. You will need to use the full path, which will vary depending on your file system and where you cloned the directory.