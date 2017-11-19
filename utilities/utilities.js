// Models
var Episode                 = require("../models/episode"),
    Series                  = require("../models/series");

// utilities
var hsScraper               = require("./hsscraper");

// Required XDCC command parts
const HS_XDCC_MSG   = "/msg ",
      HS_XDCC_BATCH = " xdcc batch ",
      HS_XDCC_SEND  = " xdcc SEND ";

/**
  *   Save episodes for each given series
  *   @function save
  *   @param    {object}  series - Series object
  */
function saveEpisodes(series) {
  // Cycle through each series passed in
  series.forEach(function(singleSeries) {
    // Scrap website with series information and obtain a list of episodes
    hsScraper.searchForSeries(singleSeries, function(episodes) {
      // Episodes are found
      if (episodes[0] != "No packs found.") {
        // Filter through found episodes for ones that match criteria
        filterAndSave(singleSeries, episodes);
      }
    });
  });
}

/**
  *   Returns a list of episode objects filtered by series preferences
  *   @function filterAndSave
  *   @param    {object}      series      - Series object from MongoDB query
  *   @param    {list}        episodes    - List of episodes scrapped from site
  */
function filterAndSave(series, episodes) {
  var botNameTruncated;
  var episodeList = [];

  // Regex to identify if bot is a CR bot
  var regexCRBot = new RegExp("^CR*");
  if (regexCRBot.exec(series.bot)) {
    // Remove everything after vertical bar
    botNameTruncated = series.bot.substring(0, series.bot.length - (series.bot.length - series.bot.indexOf("|")));
  }
  // Regex string to identify episode to start at
  var regexCurrentEpisode;
  if (series.current == 0) {
    regexCurrentEpisode = "(00|0*[0-9]|0*[1-9][0-9])";
  } else if (series.current.length == 1){
    regexCurrentEpisode = "(0*[" + series.current + "-9]|0*[1-9][0-9])";
  } else {
    regexCurrentEpisode = "(0*[" + series.current[0] + "-9][" + series.current[1] + "-9])";
  }

  // Regex to identify episodes that contain preferred bot name, episode, and quality
  var regexEpisode = new RegExp("(" + botNameTruncated + ").+[" + series.name + "&.()\-].+" + regexCurrentEpisode);

  // Filter for episodes that fulfill requirements
  for (var i = 0; i < episodes.length; i++) {
    var result = regexEpisode.exec(episodes[i]);
    if (result) {
      // Break down string to object containing episode parts
      var createdEpisode = createEpisode(series, episodes[i]);
      // Check if the filtered episodes are starting at desired start
      if (Number.parseInt(createdEpisode.episode) >= Number.parseInt(series.current)) {
        episodeList.push(createdEpisode.episode);
        // Save the episode to database
        saveEpisode(series._id, createdEpisode);
      }
      // If series is only an individual episode, exit after first match is found
      if (series.individual) {
        break;
      }
    }
  }

  // Update series to latest episode
  if (episodeList.length > 0) {
    setSeriesToEpisodeNumber(series._id, getLatestEpisodeNumber(episodeList) + 1);
  }
}

/**
  *   Return a list of commands to download pack(s) from bot
  *   @function getAllPackagesForDL
  *   @param    {list}                allAvailable  - List of episode objects
  *   @return   {list}                commands      - List of strings to download packs
  */
function getAllPackagesForDL(allAvailable) {
  var bots = [];
  var commands = [];

  // Generate commands
  allAvailable.forEach(function(available) {
    // Find index of bot in list
    var botIndex = bots.indexOf(available.bot);
    if (botIndex != -1) {
      commands[botIndex] += "," + available.pack;
    } else {
      // Push bot into list
      bots.push(available.bot);
      if (available.bot != "Ginpachi-Sensei") {
        var botCommand = HS_XDCC_MSG + available.bot + HS_XDCC_BATCH + available.pack;
      } else {
        var botCommand = HS_XDCC_MSG + available.bot + HS_XDCC_SEND + available.pack;
      }

      commands.push(botCommand);
    }
  });
  return commands;
}

/**
  *   Returns an object containing the parts of an episode
  *   @function textToParts
  *   @param    {object}      series    - Object containing all the parts of a series
  *   @param    {string}      text      - String of a single episode
  *   @return   {object}      episode   - Object containing all the parts of an episode
  */
function createEpisode(series, text) {
  // Breakdown string into required parts
  var title = (text.substring(text.indexOf("] ")+2, text.lastIndexOf(" -")));
  var episode = (text.substring(text.indexOf("- ")+1, text.lastIndexOf(" [")));
  var pack = (text.substring(text.indexOf("\t")+1, text.lastIndexOf("\t")).split("\t"))[0];
  var group = (text.substring(text.indexOf("[")+1, text.indexOf("]")));
  var bot = (text.substring(0, text.indexOf("\t")));

  // Create an episode object using parts obtained from the broken down text
  var episode = {
    title: title,
    episode: episode,
    pack: pack,
    group: group,
    bot: bot,
    series: series._id,
    tracking: true
  }

  return episode;
}

/**
  *   Save episode to database if it doesn't already exist
  *   @function saveEpisode
  *   @param    {ObjectId}    seriesId - ID of series
  *   @param    {object}      episode  - Object containing all the parts of an episode
  */
function saveEpisode(seriesId, episode) {
  // Perform a query to check if episode exists
  Episode.find({title: episode.title, episode: episode.episode, bot: episode.bot}, function(error, foundEpisode) {
    if (error) {
      console.log(error);
    } else {
      // If episode does not exist, save episode to database
      if (foundEpisode.length == 0) {
        // Save episode using information from the episode object
        Episode.create(episode, function(error, savedEpisode) {
          if (error) {
            console.log(error);
          } else {
            // Check for series to store episode in
            Series.findById(seriesId, function(error, foundSeries) {
              if (error) {
                console.log(error);
              } else {
                // Add episode to existing series
                foundSeries.episodes.push(savedEpisode);
                foundSeries.save();
              }
            });
          }
        });
      } else {
        console.log("Episode found");
      }
    }
  });
}

/**
  *   Split the list of episodes that need to be removed into episode and series IDs
  *   @function splitDeleteToParts
  *   @param    {list}              episodes                 - List of episodes where
  *                                                            episode and series IDs
  *                                                            are separated by a "|"
  *   @return   {list}              [episodeIds, seriesIds]  - List containing the
  *                                                            split episode and series
  *                                                            IDs
  */
function splitDeleteToParts(episodes) {
  var seriesIds = [];
  var episodeIds = [];
  episodes.forEach(function(episode) {
    var splitEpisode = episode.split("|");
    // Add episode ID to list
    episodeIds.push(splitEpisode[0]);
    // Check if series ID already exist in the list
    if (seriesIds.indexOf(splitEpisode[1]) == -1) {
      // Add series ID to list
      seriesIds.push(splitEpisode[1]);
    }
  });
  return [episodeIds, seriesIds];
}

/**
  *   Return the latest episode number
  *   @function getLatestEpisodeNumber
  *   @param    {list}                  episodeList - List of episodes(string)
  *   @return   {number}                max         - Latest episode
  */
function getLatestEpisodeNumber(episodeList) {
  // Convert episodeList to a list of numbers
  var intEpisodeList = episodeList.map(function(episode) {
    return Number.parseInt(episode);
  });
  // Find the highest number out of the list
  var max = intEpisodeList[0];
  for (var i = 1; i < intEpisodeList.length; i++) {
    if (max < intEpisodeList[i]) {
      max = intEpisodeList[i];
    }
  }
  return max;
}

/**
  *   Set the series's current episode to track to a number
  *   @function setSeriesToEpisodeNumber
  *   @param    {ObjectId}                seriesId      - ID of series
  *   @param    {number}                  episodeNumber - Episode number to set
  */
function setSeriesToEpisodeNumber(seriesId, episodeNumber) {
  Series.findByIdAndUpdate(seriesId, {current: episodeNumber}, function(error) {
    if (error) {
      console.log(error);
    }
  });
}

module.exports = {
  saveEpisodes: saveEpisodes,
  filterAndSave: filterAndSave,
  getAllPackagesForDL: getAllPackagesForDL,
  splitDeleteToParts: splitDeleteToParts,
  getLatestEpisodeNumber: getLatestEpisodeNumber,
  setSeriesToEpisodeNumber: setSeriesToEpisodeNumber
}
