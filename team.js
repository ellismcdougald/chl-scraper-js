const {
  scheduleSeasonIds,
  leagueKeys,
  teamIds,
} = require("./scheduleSeasonIdsAndLeagueKeys");
const axios = require("axios");

async function getTeamRoster(teamCode, league, season) {
  const jsonData = (
    await getJsonData(getRosterJsonUrl(teamCode, league, season))
  ).SiteKit.Roster;
  return jsonData;
}

function getRosterJsonUrl(teamCode, league, season) {
  const seasonId = scheduleSeasonIds[league][season];
  const leagueKey = leagueKeys[league];
  const teamId = teamIds[league][teamCode];
  return `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=roster&key=${leagueKey}&fmt=json&client_code=${league}&league_code=&lang=en&team_id=${teamId}&category=profile&season_id=${seasonId}`;
}

async function getJsonData(jsonUrl) {
  /*
        Gets the json data for a given url.
        - jsonUrl: the url to get the json data from, string
        */
  const response = await axios.get(jsonUrl);
  return response.data;
}

module.exports = { getTeamRoster };
