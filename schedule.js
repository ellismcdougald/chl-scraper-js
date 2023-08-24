module.exports = { getLeagueSchedule };

const {
  scheduleSeasonIds,
  leagueKeys,
} = require("./scheduleSeasonIdsAndLeagueKeys");

const axios = require("axios");

async function getLeagueSchedule(startDate, endDate, league) {
  /*
    Returns the league schedule for all games played between the start date and the end date.
    - startDate: the start date of the time interval you would like to scrape, string as format 'YYYY-MM-DD'
    - endDate, the end date of the time interval you would like to scrape, string as format 'YYYY-MM-DD'
    - league: the league whose schedule you would like to scrape, string. One of ('ohl', 'whl', 'lhjmq')
    */

  const startYear = parseInt(startDate.substring(0, 4));
  const startMonth = parseInt(startDate.substring(5, 7));
  const endYear = parseInt(endDate.substring(0, 4));
  const endMonth = parseInt(endDate.substring(5, 7));

  const loopStartYear = startMonth <= 4 ? startYear - 1 : startYear;
  const loopEndYear = endMonth <= 4 ? endYear - 1 : endYear;

  let seasons = [];
  for (let year = loopStartYear; year <= loopEndYear; year++) {
    seasons.push(`${year}-${year + 1}`);
  }

  let scheduleGames = [];
  for (const season of seasons) {
    scheduleGames.push(
      ...(await getScheduleGames(season, league, startDate, endDate))
    );
  }
  return scheduleGames;
}

function getScheduleUrl(season, league) {
  /*
    Returns the CHL lscluster.hockeytech.com url with the schedule data for a specific season.
    - season: the season whose schedule you would like to scrape, string as format 'YYYY-MM-DD'
    - league: the league whose schedule you would like to scrape, string. One of ('ohl', 'whl', 'lhjmq')
    */
  const seasonId = scheduleSeasonIds[league][season];
  if (!seasonId) {
    return null;
  }
  const leagueKey = leagueKeys[league];

  return `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=${leagueKey}&fmt=json&client_code=${league}&lang=en&season_id=${seasonId}&team_id=&league_code=&fmt=json`;
}

async function getScheduleGames(season, league, startDate, endDate) {
  /*
    Returns the game info for all games from a schedule between the start date and the end date.
    - season: the season whose schedule you would like to scrape, string as format 'YYYY-MM-DD'
    - league: the league whose schedule you would like to scrape, string. One of ('ohl', 'whl', 'lhjmq')
    - startDate: the start date of the time interval you would like to scrape, string as format 'YYYY-MM-DD'
    - endDate, the end date of the time interval you would like to scrape, string as format 'YYYY-MM-DD'
    */
  const scheduleUrl = getScheduleUrl(season, league);
  if (!scheduleUrl) {
    return [];
  }
  const json = await axios.get(scheduleUrl);
  const scheduleData = json.data.SiteKit.Schedule;
  const filteredScheduleData = scheduleData.filter(
    (game) =>
      Date.parse(game.date_played) >= Date.parse(startDate) &&
      Date.parse(game.date_played) <= Date.parse(endDate)
  );
  const filteredScheduleGames = filteredScheduleData.map((game) => {
    return {
      id: parseInt(game.id),
      date_played: game.date_played,
      season_id: parseInt(game.season_id),
      league: league,
      home_team: game.home_team_code,
      visiting_team: game.visiting_team_code,
      home_score: parseInt(game.home_goal_count),
      visiting_score: parseInt(game.visiting_goal_count),
    };
  });
  return filteredScheduleGames;
}
