using HtmlAgilityPack;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace GtfsService.GooglePublicFeeds
{
	/// <summary>
	/// Provides information about a GTFS feed.
	/// </summary>
	public class PublicFeedListItem
	{
		/// <summary>
		/// The name of the agency providing the GTFS feed.
		/// </summary>
		public string AgencyName { get; set; }
		/// <summary>
		/// The URL of the agency.
		/// </summary>
		public string AgencyUri { get; set; }
		/// <summary>
		/// The area that the agency covers.
		/// </summary>
		public string Area { get; set; }
		/// <summary>
		/// The URL to the feed data.
		/// </summary>
		public string FeedLocation { get; set; }
		/// <summary>
		/// Notes about the feed.
		/// </summary>
		public string Notes { get; set; }
	}

	/// <summary>
	/// Reads an HTML table listing GTFS feeds.
	/// </summary>
	public static class PublicFeedTableReader
	{
		const string tableUniqueSelector = "//*[@id='wikimaincol']//table";

		private static PublicFeedListItem ToPublicFeedListItem(this HtmlNode rowNode)
		{
			var output = new PublicFeedListItem();
			var cellNodes = rowNode.SelectNodes("td");
			if (cellNodes == null || cellNodes.Count < 4)
			{
				return null;
			}
			var agencyLink = cellNodes[0].SelectSingleNode("a");
			if (agencyLink == null)
			{
				return null;
			}
			else
			{
				output.AgencyName = agencyLink.WriteContentTo();
				output.AgencyUri = agencyLink.GetAttributeValue("href", default(string));
				output.Area = cellNodes[1].WriteContentTo();

				var feedLink = cellNodes[2].SelectSingleNode("a");
				if (feedLink != null)
				{
					output.FeedLocation = feedLink.GetAttributeValue("href", default(string));
				}

				output.Notes = cellNodes[3].InnerText;
				return output;
			}
		}

		/// <summary>
		/// Gets a list of GTFS feeds from an HTML page.
		/// </summary>
		/// <param name="feedUrl">Optional. URL to the HTML file that lists the feeds.</param>
		/// <returns></returns>
		public static List<PublicFeedListItem> GetFeedList(string feedUrl = "http://code.google.com/p/googletransitdatafeed/wiki/PublicFeeds")
		{
			List<PublicFeedListItem> list = null;
			HtmlDocument htmlDoc = null;
			using (var client = new HttpClient())
			{
				client.GetStreamAsync(feedUrl).ContinueWith(streamTask => {
					htmlDoc = new HtmlDocument();
					htmlDoc.Load(streamTask.Result);
				}).Wait();
				
			}
			var tableNode = htmlDoc.DocumentNode.SelectSingleNode(tableUniqueSelector);
			var rows = tableNode.SelectNodes("//tr");
			list = rows.Select(row => ToPublicFeedListItem(row)).Where(item => item != null).ToList();
			return list;
		}

	}
}