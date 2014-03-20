ALPACA (Application for Local Planning and Community Accessibility)
===================================================================

## Submodules ##

This project uses the [GTFS-Service] project as a [submodule], which itself uses [GTFS.NET] as submodule. To ensure all submodules are checked out, use the following command when cloning this repository.

	git clone --recurse-submodules https://github.com/WSDOT-GIS/Alpaca.git

If you have already cloned the repository without the `--recurse-submodules` option then use the following command to get the submodules.

	git submodule update --init --recursive

## License ##
Licensed under [The MIT License]. See the `LICENSE.txt` file for details.

[The MIT License]:http://choosealicense.com/licenses/mit/
[GTFS.NET]:https://github.com/WSDOT-GIS/GTFS.NET
[GTFS-Service]:https://github.com/WSDOT-GIS/GTFS-Service/
[submodule]:http://git-scm.com/book/en/Git-Tools-Submodules
