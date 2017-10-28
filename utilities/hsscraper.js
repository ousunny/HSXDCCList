// Required packages
var request                 = require("request"),
    jsdom                   = require("jsdom"),
    phantom                 = require("phantom");

// Sites
var HS_URL                  = "http://horriblesubs.info/";
var HS_XDCC_URL             = "http://xdcc.horriblesubs.info/";
var HS_XDCC_SEARCH          = "http://xdcc.horriblesubs.info/?search=";

/**
  *   Get an updated list of currently available bots,
  *   then pass the list to a callback function.
  *   @function getBotList
  *   @param    {function(list)}  callback - Callback signature is (bots),
  *                                          bots is a list.
  */
function getBotList(callback) {
  (async function() {
    // Create phantom instance and page
    const instance = await phantom.create();
    const page = await instance.createPage();
    await page.on("onResourceRequested", function(requestData) {
      console.log("Requesting ", requestData.url);
    });
    const status = await page.open(HS_XDCC_URL);

    // Get all currently available bots
    var bots = await page.evaluate(function() {
      var botList = [];
      var elements = document.querySelectorAll(".botlist h3:nth-of-type(2) ~ a");

      for (i = 0; i < elements.length; i++) {
        botList[i] = elements[i].text;
      }

      return botList;
    });

    await instance.exit();
    callback(bots);
  })();
}

/**
  *   Search for series by name, then pass the results to a callback.
  *   @function searchForSeries
  *   @param    {object}          series    - Series object to search.
  *   @param    {function(list)}  callback  - Callback signature is episodes,
  *                                         - episodes is a list.
  */
function searchForSeries(series, callback) {
    (async function() {
      // Create phantom instance and page
      const instance = await phantom.create();
      const page = await instance.createPage()

      await page.on("onResourceRequested", function(requestData) {
        console.log("Requesting ", requestData.url);
      });

      // Prepend a "0" if the episode is a single digit to prevent returning unrelated episodes
      if (series.current.length == 1) {
        series.current = "0" + series.current;
      }

      // Perform different search queries depending on individual or all episodes
      if (series.individual) {
        const status = await page.open(HS_XDCC_SEARCH + series.name + " - " + series.current + " " + series.quality);
      } else {
        const status = await page.open(HS_XDCC_SEARCH + series.name + " " + series.quality);
      }

      // Wait for a delay before scrapping for list of episodes
      setTimeout(function() {
        page.evaluate(function() {
          var episodeList = [];

          var elements = document.querySelectorAll("table[id=\"listtable\"] tbody .animeColumn ~ tr");
          for (var i = 0; i < elements.length; i++) {
            episodeList[i] = elements[i].innerText;
          }

          return episodeList;
        }).then(function(episodes) {
          instance.exit();
          callback(episodes);
        });
      }, 2000);
    })();
}

module.exports = {
  getBotList: getBotList,
  searchForSeries: searchForSeries
}
