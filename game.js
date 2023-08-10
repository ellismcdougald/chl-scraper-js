const { leagueKeys } = require("./scheduleSeasonIdsAndLeagueKeys");
const {
  getShotsFaceoffsAndPenalties,
} = require("./getShotsFaceoffsAndPenalties");

const axios = require("axios");

async function scrapeGame(gameId, league) {
  /*
    Returns the game info and skater statistics for the game indicated by the given game id and league
    - gameId: the chl.ca game id, int
    - league: the league the game was played in, string. One of ('ohl', 'whl', 'lhjmq')
    */
  const [pxpJsonUrl, gsJsonUrl] = getGameJsonUrls(gameId, league);
  const pxpData = (await getJsonData(pxpJsonUrl)).GC.Pxpverbose;
  const gsData = (await getJsonData(gsJsonUrl)).GC.Gamesummary;

  const gameStats = await getSingleGamePlayerStats(gsData, pxpData, league);

  return gameStats;
}

function getGameJsonUrls(gameId, league) {
  /*
    Returns the CHL lscluster.hockeytech.com URLs containing the play by play and game summary data for a given game.
    Returns an array
    - gameId: the chl.ca game id, int
    - league: the league the game was played in, string. One of ('ohl', 'whl', 'lhjmq')
    */
  const leagueKey = leagueKeys[league];
  return ["pxpverbose", "gamesummary"].map((tab) => {
    return `https://cluster.leaguestat.com/feed/index.php?feed=gc&key=${leagueKey}&client_code=${league}&game_id=${gameId}&lang_code=en&fmt=json&tab=${tab}`;
  });
}

async function getJsonData(jsonUrl) {
  /*
    Gets the json data for a given url.
    - jsonUrl: the url to get the json data from, string
    */
  const response = await axios.get(jsonUrl);
  return response.data;
}

async function getSingleGamePlayerStats(gameSummary, pxpData, league) {
  /*
    Gets game info and lineup stats given the the game summary, play by play data, and league of a given game.
    - gameSummary: the game summary data, object
    - pxpData: the play by play data, object
    - league: the league of the game, string. One of ('ohl', 'whl', 'lhjmq')
    */
  const data = await getData(gameSummary, league);
  if (!data.goals) data.goals = [];
  if (!data.shots) data.shots = [];

  const shotsFaceoffsPenalties = await getShotsFaceoffsAndPenalties(pxpData);
  const lineupArrays = initializeLineupArrays(
    data.homeLineup.players,
    data.visitorLineup.players,
    gameSummary.home.team_code,
    gameSummary.visitor.team_code
  );
  populateLineupArrays(
    lineupArrays,
    data.goals,
    shotsFaceoffsPenalties.shots,
    shotsFaceoffsPenalties.faceoffs,
    shotsFaceoffsPenalties.penalties
  );

  const goalieStats = getGoalieStats(gameSummary);

  return {
    gameInfo: data.gameInfo,
    lineups: lineupArrays,
    goalies: goalieStats,
  };
}

function getGoalieStats(gameSummary) {
  /*
  Returns the goalie statistics from a given game summary.
  - gameSummary: the game summary, object
  */
  const goalieStats = {
    home: gameSummary.home_team_lineup.goalies.map((goalieObj) => {
      return {
        playerId: goalieObj.player_id,
        personId: goalieObj.person_id,
        name: `${goalieObj.first_name} ${goalieObj.last_name}`,
        teamCode: gameSummary.home.team_code,
        minutes: goalieObj.seconds / 60,
        shotsAgainst: goalieObj.shots_against,
        goalsAgainst: goalieObj.goals_against,
      };
    }),
    visitor: gameSummary.visitor_team_lineup.goalies.map((goalieObj) => {
      return {
        playerId: goalieObj.player_id,
        personId: goalieObj.person_id,
        name: `${goalieObj.first_name} ${goalieObj.last_name}`,
        teamCode: gameSummary.visitor.team_code,
        minutes: goalieObj.seconds / 60,
        shotsAgainst: goalieObj.shots_against,
        goalsAgainst: goalieObj.goals_against,
      };
    }),
  };

  return goalieStats;
}

async function getData(gameSummary, league) {
  /*
  Returns an object containing data from a game summary of a game.
  - gameSummary: the game summary, object
  - league: the league the game was played in, string. One of ('ohl', 'whl', 'lhjmq')
  */
  const returnData = [];
  returnData.gameInfo = getGameInfo(gameSummary, league);
  returnData.homeLineup = gameSummary.home_team_lineup;
  returnData.visitorLineup = gameSummary.visitor_team_lineup;
  returnData.goals = gameSummary.goals;
  returnData.penalties = gameSummary.penalties;

  return returnData;
}

function getGameInfo(gsData, league) {
  /*
  Returns an object containing the descriptive data from a game summary of a game.
  - gsData: the game summary, object
  - league: the league the game was played in, string. One of ('ohl', 'whl', 'lhjmq')
  */
  const gameInfo = {};

  gameInfo.gameId = gsData.meta.id;
  gameInfo.date = gsData.meta.date_played;
  gameInfo.league = league;
  gameInfo.homeTeam = gsData.home.name;
  gameInfo.homeCode = gsData.home.team_code;
  gameInfo.visitorTeam = gsData.visitor.name;
  gameInfo.visitorCode = gsData.visitor.team_code;
  gameInfo.homeGoals = gsData.meta.home_goal_count;
  gameInfo.visitorGoals = gsData.meta.visiting_goal_count;

  return gameInfo;
}

function initializeLineupArrays(
  homeLineup,
  visitorLineup,
  homeTeam,
  visitingTeam
) {
  /*
  Returns an object containing the initialized (but not populated) lineup arrays for the home and visiting lineups.
  - homeLineup: the home lineup info, array
  - visitorLineup: the visiting lineup info, array
  - homeTeam: the home team code, string
  - visitingTeam: the visiting team code, string
  */
  return {
    home: initializeLineupArray(homeLineup, homeTeam),
    visitor: initializeLineupArray(visitorLineup, visitingTeam),
  };
}

function initializeLineupArray(lineup, teamCode) {
  /*
  Returns an initialized lineup statistic array given the lineup info and team code
  - lineup: list of player details, array
  - teamCode: the team code, string
  */
  let lineupArray = [];
  let playerObject = {};
  for (const player of lineup) {
    playerObject = {};
    playerObject.playerId = parseInt(player.player_id);
    playerObject.personId = parseInt(player.person_id);
    playerObject.teamCode = teamCode;
    playerObject.position = player.position_str;
    playerObject.general = {
      goals: player.goals,
      assists: player.assists,
      shotAttempts: parseInt(player.shots),
      shotsOnGoal: parseInt(player.shots_on),
      faceoff_wins: parseInt(player.faceoff_wins),
      faceoff_attempts: parseInt(player.faceoff_attempts),
      hits: parseInt(player.hits),
      pim: player.pim,
      penalties_taken: 0,
    };
    playerObject.evenStrength = {
      goals: 0,
      firstAssists: 0,
      secondAssists: 0,
      shots: 0,
      faceoff_wins: 0,
      faceoff_losses: 0,
      onIceGoalsFor: 0,
      onIceGoalsAgainst: 0,
    };
    playerObject.powerplay = {
      goals: 0,
      firstAssists: 0,
      secondAssists: 0,
      shots: 0,
      faceoff_wins: 0,
      faceoff_losses: 0,
    };
    playerObject.shorthanded = {
      goals: 0,
      firstAssists: 0,
      secondAssists: 0,
      shots: 0,
      faceoff_wins: 0,
      faceoff_losses: 0,
    };
    playerObject.emptyNet = {
      goals: 0,
      firstAssists: 0,
      secondAssists: 0,
    };
    playerObject.penaltyShot = {
      goals: 0,
    };
    lineupArray.push(playerObject);
  }
  return lineupArray;
}

function populateLineupArrays(lineupArrays, goals, shots, faceoffs, penalties) {
  /*
  Populates the home and visiting lineup arrays given the game statistic data.
  - lineupArrays: object containing home and visiting lineup arrays
  - goals: list of the game goals and their info
  - shots: list of the game shots and their info
  - faceoffs: list of the game faceoffs and their info
  - penalties: list of the game penalties and their info
  */
  populateLineupArray(
    lineupArrays.home,
    goals,
    shots,
    faceoffs,
    penalties,
    true
  );
  populateLineupArray(
    lineupArrays.visitor,
    goals,
    shots,
    faceoffs,
    penalties,
    false
  );
}

function populateLineupArray(lineup, goals, shots, faceoffs, penalties, home) {
  /*
  Populates a lineup array given the game statistic data.
  - lineup: the lineup array
  - goals: list of the game goals and their info
  - shots: list of the game shots and their info
  - faceoffs: list of the game faceoffs and their info
  - penalties: list of the game penalties and their info
  - home: boolean indicating whether this lineup is the home team or not (true if home)
  */
  let teamGoals;
  let teamShots;

  if (!goals) {
    teamGoals = [];
  } else {
    if (home) {
      teamGoals = goals.filter((goal) => goal.home === "1");
    } else {
      teamGoals = goals.filter((goal) => goal.home === "0");
    }
  }
  if (!shots) {
    teamShots = [];
  } else {
    if (home) {
      teamShots = shots.filter((shot) => shot.home === true);
    } else {
      teamShots = shots.filter((shot) => shot.home === false);
    }
  }
  if (!penalties) {
    teamPenalties = [];
  } else {
    if (home) {
      teamPenalties = penalties.filter((penalty) => penalty.home === true);
    } else {
      teamPenalties = penalties.filter((penalty) => penalty.home === false);
    }
  }

  for (const goal of goals) {
    incrementPlusMinus(lineup, goal);
  }
  for (const teamGoal of teamGoals) {
    incrementPointGetters(lineup, teamGoal);
  }
  for (const teamShot of teamShots) {
    incrementShots(lineup, teamShot);
  }
  for (const faceoff of faceoffs) {
    incrementFaceoffs(lineup, faceoff, home);
  }
  for (const penalty of teamPenalties) {
    incrementPenalties(lineup, penalty);
  }
}

function incrementPenalties(lineup, penalty) {
  /*
  Receives a penalty object and increments the penalty count of the correct player in the lineup array.
  - lineup: the lineup array
  - penalty: the penalty object
  */
  const penaltyTaker = lineup.find(
    (player) => player.playerId === parseInt(penalty.player_id)
  );
  if (penaltyTaker) {
    penaltyTaker.general.penalties_taken++;
  }
}

function incrementFaceoffs(lineup, faceoff, home) {
  /*
  Receives a faceoff object and increments the faceoff count of the correct player in the lineup array.
  - lineup: the lineup array
  - faceoff: the faceoff object
  - home: boolean indicating whether the lineup array is the home team (true if home)
  */
  const faceoffTaker = lineup.find(
    (player) =>
      player.playerId ===
      parseInt(home ? faceoff.home_player_id : faceoff.visitor_player_id)
  );

  if (faceoff.homeStrength === faceoff.visitorStrength) {
    if (home === faceoff.home) {
      faceoffTaker.evenStrength.faceoff_wins++;
    } else {
      faceoffTaker.evenStrength.faceoff_losses++;
    }
  } else {
    if (home === faceoff.home) {
      if (faceoff.homeStrength > faceoff.visitorStrength) {
        faceoffTaker.powerplay.faceoff_wins++;
      } else {
        faceoffTaker.shorthanded.faceoff_wins++;
      }
    } else {
      if (faceoff.homeStrength > faceoff.visitorStrength) {
        faceoffTaker.powerplay.faceoff_losses++;
      } else {
        faceoffTaker.shorthanded.faceoff_losses++;
      }
    }
  }
}

function incrementPointGetters(lineup, goal) {
  /*
  Receives a goal object and increments the goal and assist counts of the appropriate players in the lineup array.
  - lineup: the lineup array
  - goal: the goal object
  */
  const goalScorer = lineup.find(
    (player) => player.playerId === parseInt(goal.goal_scorer.player_id)
  );
  const firstAssister = lineup.find(
    (player) => player.playerId === parseInt(goal.assist1_player.player_id)
  );
  const secondAssister = lineup.find(
    (player) => player.playerId === parseInt(goal.assist2_player.player_id)
  );

  let goalState;
  if (
    goal.power_play === "0" &&
    goal.empty_net === "0" &&
    goal.penalty_shot === "0" &&
    goal.short_handed === "0"
  ) {
    goalState = "evenStrength";
  } else if (goal.empty_net === "1") {
    goalState = "emptyNet";
  } else if (goal.power_play === "1") {
    goalState = "powerplay";
  } else if (goal.short_handed === "1") {
    goalState = "shorthanded";
  } else if (goal.penalty_shot === "1") {
    goalState = "penaltyShot";
  }

  goalScorer[goalState].goals++;
  if (firstAssister) firstAssister[goalState].firstAssists++;
  if (secondAssister) secondAssister[goalState].secondAssists++;
}

function incrementPlusMinus(lineup, goal) {
  /*
  Receives a goal object and increments the goals for and goals against counts of the appropriate players in the lineup array.
  - lineup: the lineup array
  - goal: the goal object
  */
  if (
    goal.power_play === "0" &&
    goal.empty_net === "0" &&
    goal.penalty_shot === "0" &&
    goal.short_handed === "0"
  ) {
    const pluses = goal.plus.map((x) => x.player_id);
    const minuses = goal.minus.map((x) => x.player_id);

    let playerTemp;
    for (const id of pluses) {
      playerTemp = lineup.find((player) => player.playerId === parseInt(id));
      if (playerTemp) playerTemp.evenStrength.onIceGoalsFor++;
    }
    for (id of minuses) {
      playerTemp = lineup.find((player) => player.playerId === parseInt(id));
      if (playerTemp) playerTemp.evenStrength.onIceGoalsAgainst++;
    }
  }
}

function incrementShots(lineup, shot) {
  /*
  Receives a shot object and increments the shot counts of the appropriate players in the lineup array.
  - lineup: the lineup array
  - shot: the shot object
  */
  const shotTaker = lineup.find(
    (player) => player.playerId === parseInt(shot.player_id)
  );
  if (shotTaker) {
    if (shot.homeStrength === shot.visitorStrength) {
      shotTaker.evenStrength.shots++;
    } else {
      if (shot.home === true) {
        if (shot.homeStrength > shot.visitorStrength) {
          shotTaker.powerplay.shots++;
        } else {
          shotTaker.shorthanded.shots++;
        }
      } else {
        if (shot.visitorStrength > shot.homeStrength) {
          shotTaker.powerplay.shots++;
        } else {
          shotTaker.shorthanded.shots++;
        }
      }
    }
  }
}

scrapeGame(26459, "ohl").then((result) => console.log(result.goalies));
