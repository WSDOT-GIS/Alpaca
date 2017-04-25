#pragma warning disable 1591
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Net.Http.Formatting;
using System.Web.Http;
using System.Web.Mvc;

namespace GtfsService
{
	public class Global : System.Web.HttpApplication
	{

		protected void Application_Start(object sender, EventArgs e)
		{
			AreaRegistration.RegisterAllAreas();
			var config = GlobalConfiguration.Configuration;
			// Configure JSON output...
			var jsonSettings = config.Formatters.JsonFormatter.SerializerSettings;
			// Null values will not be written to output.
			jsonSettings.NullValueHandling = NullValueHandling.Ignore;
			// Enums will be written as strings instead of ints.
			jsonSettings.Converters.Add(new StringEnumConverter());
			jsonSettings.DateFormatHandling = DateFormatHandling.IsoDateFormat;

			config.MapHttpAttributeRoutes();
			config.EnsureInitialized();
		}

		protected void Session_Start(object sender, EventArgs e)
		{

		}

		protected void Application_BeginRequest(object sender, EventArgs e)
		{

		}

		protected void Application_AuthenticateRequest(object sender, EventArgs e)
		{

		}

		protected void Application_Error(object sender, EventArgs e)
		{

		}

		protected void Session_End(object sender, EventArgs e)
		{

		}

		protected void Application_End(object sender, EventArgs e)
		{

		}
	}
}
#pragma warning restore 0649
