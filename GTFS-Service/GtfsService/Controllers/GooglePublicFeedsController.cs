using GtfsService.GooglePublicFeeds;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web.Http;

namespace GtfsService.Controllers
{
	/// <summary>
	/// WebAPI controller for accessing feed data from <see href="http://code.google.com/p/googletransitdatafeed/wiki/PublicFeeds"/>.
	/// </summary>
	public class GooglePublicFeedsController : ApiController
	{
		/// <summary>
		/// Returns a list of WA GTFS feeds from <see href="http://code.google.com/p/googletransitdatafeed/wiki/PublicFeeds"/>.
		/// </summary>
		/// <returns>A list of public GTFS feeds.</returns>
		[Route("api/PublicFeeds")]
		public List<PublicFeedListItem> Get()
		{
			var feeds = GooglePublicFeeds.PublicFeedTableReader.GetFeedList();
			Regex waRegex = new Regex(@"((,\sWA)|(Washington\sState))\s*$", RegexOptions.IgnoreCase | RegexOptions.ExplicitCapture);
			return feeds.Where(feed => waRegex.IsMatch(feed.Area)).ToList();
		}
	}
}
