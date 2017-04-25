#pragma warning disable 1591
using System;
using System.Reflection;

namespace GtfsService.Areas.HelpPage.ModelDescriptions
{
	public interface IModelDocumentationProvider
	{
		string GetDocumentation(MemberInfo member);

		string GetDocumentation(Type type);
	}
}
#pragma warning restore 1591
