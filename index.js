const { scrapeGame } = require("./game");
const { getLeagueSchedule } = require("./schedule");
const { getPlayer } = require("./player");
const { getTeamRoster } = require("./team");

module.exports = { scrapeGame, getLeagueSchedule, getPlayer, getTeamRoster };
