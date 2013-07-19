using System.Text.RegularExpressions;
using System.Web;

namespace Proxy
{
	public static class Extensions
	{
		/// <summary>
		/// Determines if the <see cref="HttpRequest.Url"/> is from the same site as the <see cref="HttpRequest.UrlReferrer"/>
		/// in a given <see cref="HttpContext"/>.
		/// </summary>
		/// <param name="context"></param>
		/// <returns>
		/// Returns <see langword="null"/> if there is no <see cref="HttpRequest.UrlReferrer"/>, 
		/// <see langword="true"/> if there is a match, <see langword="false"/> if not.
		/// </returns>
		public static bool? IsReferrerSameSite(this HttpRequest request)
		{
			// If there is no referrer, return false.
			if (request.UrlReferrer == null)
			{
				return null;
			}

			// Get the root part of the URL...
			Regex re = new Regex(@"/^https?\:\/\/[^\/]+/", RegexOptions.IgnoreCase);
			// Create a Regex that will match if the referrer URL matches the current URL.
			Match m = re.Match(request.Url.ToString());
			re = new Regex("^" + Regex.Escape(m.Value), RegexOptions.IgnoreCase);

			// Return true if the referrer is a match, false otherwise.
			return re.IsMatch(request.UrlReferrer.ToString());
		}
	}
}