#pragma warning disable 1591
using System.Collections.ObjectModel;

namespace GtfsService.Areas.HelpPage.ModelDescriptions
{
	public class ComplexTypeModelDescription : ModelDescription
	{
		public ComplexTypeModelDescription()
		{
			Properties = new Collection<ParameterDescription>();
		}

		public Collection<ParameterDescription> Properties { get; private set; }
	}
}
#pragma warning restore 1591
