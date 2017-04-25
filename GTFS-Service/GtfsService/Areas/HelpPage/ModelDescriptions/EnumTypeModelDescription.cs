#pragma warning disable 1591
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace GtfsService.Areas.HelpPage.ModelDescriptions
{
	public class EnumTypeModelDescription : ModelDescription
	{
		public EnumTypeModelDescription()
		{
			Values = new Collection<EnumValueDescription>();
		}

		public Collection<EnumValueDescription> Values { get; private set; }
	}
}
#pragma warning restore 1591
