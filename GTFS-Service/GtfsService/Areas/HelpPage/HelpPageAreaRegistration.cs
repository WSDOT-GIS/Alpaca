#pragma warning disable 1591
using System.Web.Http;
using System.Web.Mvc;

namespace GtfsService.Areas.HelpPage
{
	public class HelpPageAreaRegistration : AreaRegistration
	{
		public override string AreaName
		{
			get
			{
				return "HelpPage";
			}
		}

		public override void RegisterArea(AreaRegistrationContext context)
		{
			context.MapRoute(
				"HelpPage_Default",
				"Help/{action}/{apiId}",
				new { controller = "Help", action = "Index", apiId = UrlParameter.Optional });

			HelpPageConfig.Register(GlobalConfiguration.Configuration);
		}
	}
}
#pragma warning restore 1591
