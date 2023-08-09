module.exports = { getShotsFaceoffsAndPenalties };

async function getShotsFaceoffsAndPenalties(pxpData) {
  /*
    Returns lists of the shots, faceoffs, and penalties with their corresponding game states from the given play by play data of a game.
    - pxpData: the pxp data, array
    */
  let data = await getGameStates(pxpData);
  data = {
    shots: data.filter((event) => event.event === "shot"),
    faceoffs: data.filter((event) => event.event == "faceoff"),
    penalties: data.filter((event) => event.event === "penalty"),
  };
  return data;
}

async function getGameStates(pxpData) {
  /*
    Populates an array of play by play data with the corresponding game states of each event.
    - pxpData: the array of play by play data
    */
  let data = await getCleanedData(pxpData);
  let homeActive = [];
  let homeWaiting = [];
  let visitorActive = [];
  let visitorWaiting = [];

  for (const event of data) {
    handleEvent(event, homeActive, homeWaiting, visitorActive, visitorWaiting);
  }

  return data;
}

async function getCleanedData(pxpData) {
  /*
  Selects shots, faceoffs, and penalties that lead to game state changes from an array of play by play data and cleans up some data fields.
  - pxpData: array of play by play data
  */
  pxpData = pxpData.filter(
    (x) =>
      x.event === "shot" ||
      x.event == "faceoff" ||
      (x.event === "penalty" && x.pp === "1")
  );

  for (const event of pxpData) {
    if (event.event === "faceoff") {
      if (event.home_win === "1") {
        event.home = true;
      } else if (event.home_win === "0") {
        event.home = false;
      } else {
        return Error("Invalid home value");
      }
    } else {
      if (event.home === "1") {
        event.home = true;
      } else if (event.home === "0") {
        event.home = false;
      } else {
        return Error("Invalid home value");
      }
    }

    if (event.period_id !== "OT") {
      event.time = (parseInt(event.period_id) - 1) * 1200 + event.s;
    } else {
      event.time = 3600 * event.s;
    }

    if (event.event === "penalty") {
      event.player_served = parseInt(event.player_served);
      event.minutes = parseInt(event.minutes);
    }
  }

  return pxpData;
}

function handleEvent(
  event,
  homeActive,
  homeWaiting,
  visitorActive,
  visitorWaiting
) {
  /*
  Updates the penalty lists of an event from an array of play by play data.
  - event: the event, object
  - homeActive: the home active penalty list, array
  - homeWaiting: the home waiting penalty list, array
  - visitorActive: the visitor active penalty list, array
  - visitorWaiting: the visitor waiting penalty list, array
  */

  updatePenaltyListsByTime(event.time, homeActive, homeWaiting);
  updatePenaltyListsByTime(event.time, visitorActive, visitorWaiting);
  event.homeStrength = 5 - homeActive.length;
  event.visitorStrength = 5 - visitorActive.length;
  if (event.event === "shot" && event.game_goal_id !== "") {
    updatePenaltyListsByGoal(event, homeActive, homeWaiting);
    updatePenaltyListsByGoal(event, visitorActive, visitorWaiting);
  } else if (event.event == "penalty") {
    processNewPenalty(
      event,
      homeActive,
      homeWaiting,
      visitorActive,
      visitorWaiting
    );
  }
}

function processNewPenalty(
  penalty,
  homeActive,
  homeWaiting,
  visitorActive,
  visitorWaiting
) {
  /*
  Calls processPenalty with the appropriate penalty lists.
  - penalty: the penalty object
  - homeActive: the home active penalty list, array
  - homeWaiting: the home waiting penalty list, array
  - visitorActive: the visitor active penalty list, array
  - visitorWaiting: the visitor waiting penalty list, array
  */
  if (penalty.home) {
    processPenalty(penalty, homeActive, homeWaiting);
  } else if (!penalty.home) {
    processPenalty(penalty, visitorActive, visitorWaiting);
  } else {
    return Error("Invalid penalty home value -- should be boolean");
  }
}

function processPenalty(penalty, active, waiting) {
  /*
  Adds a penalty to either the active or waiting penalty list as appropriate.
  - penalty: the penalty object
  - active: the active penalty list, array
  - waiting: the waiting penalty list, array
  */
  if (
    active.length < 2 &&
    checkPenaltyListForID(penalty.playerID, active) === -1
  ) {
    penalty.endTime = penalty.time + penalty.minutes * 60;
    delete penalty.time; //removes penalty time since it is no longer needed
    active.push(penalty);
  } else {
    delete penalty.time;
    waiting.push(penalty);
  }
}

function updatePenaltyListsByTime(time, activePenalties, waitingPenalties) {
  /*
  Removes expired penalties on basis of time from active penalty lists and shifts waiting penalties into active penalty lists as appropriate.
  - time: the game time in seconds, int
  - activePenalties: the active penalty list, array
  - waitingPenalties: the waiting penalty list, array
  */
  let changesMade = true;
  let expiringPenalties = [];
  while (changesMade) {
    changesMade = false;
    for (const activePenalty of activePenalties) {
      if (time > activePenalty.endTime) {
        expiringPenalties.push(activePenalty);
        changesMade = true;
      }
    }
    for (const expiringPenalty of expiringPenalties) {
      removePenaltyFromList(expiringPenalty, activePenalties);
      for (const waitingPenalty of waitingPenalties) {
        if (
          checkPenaltyListForID(
            waitingPenalty.player_served,
            activePenalties
          ) === -1 &&
          checkPenaltyListForID(
            waitingPenalty.player_served,
            expiringPenalties
          ) === -1
        ) {
          waitingPenalty.endTime =
            expiringPenalty.endTime + waitingPenalty.minutes * 60;
          activePenalties.push(waitingPenalty);
          removePenaltyFromList(waitingPenalty, waitingPenalties);
          break;
        } else if (
          waitingPenalty.player_served === expiringPenalty.player_served
        ) {
          waitingPenalty.endTime =
            expiringPenalty.endTime + waitingPenalty.minutes * 60;
          activePenalties.push(waitingPenalty);
          removePenaltyFromList(waitingPenalty, waitingPenalties);
          break;
        }
      }
    }
  }
}

function updatePenaltyListsByGoal(goal, activePenalties, waitingPenalties) {
  /*
    Removes expired penalties on basis of goal against from active penalty list and shifts waiting penalties to active as appropriate.
    - goal: the goal object
    - activePenalties: the active penalty list, array
    - waitingPenalties: the waiting penalty list, array
    */
  if (activePenalties.length > 0 && goal.home !== activePenalties[0].home) {
    for (let i = 0; i < activePenalties.length; i++) {
      if (activePenalties[i].minutes === 2) {
        activePenalties.splice(i, 1);
        break;
      }
    }
    for (waitingPenalty of waitingPenalties) {
      if (
        checkPenaltyListForID(waitingPenalty.playerID, activePenalties) === -1
      ) {
        waitingPenalty.endTime = goal.time + waitingPenalty.minutes * 60;
        activePenalties.push(waitingPenalty);
        removePenaltyFromList(waitingPenalty, waitingPenalties);
        break;
      }
    }
  }
}

function removePenaltyFromList(penalty, penaltyList) {
  /*
  Removes a penalty object from a list of penalty objects.
  - penalty: the penalty object
  - penaltyList: the list of penalty objects
  */
  for (let i = 0; i < penaltyList.length; i++) {
    if (penaltyList[i] === penalty) {
      penaltyList.splice(i, 1);
      break;
    }
  }
}

function checkPenaltyListForID(player_served, penaltyList) {
  /*
    Checks if a given player already has a penalty in the penalty list.
    - player_served: the player object
    - penaltyList: the list of penalty objects
    */
  for (let i = 0; i < penaltyList.length; i++) {
    if (player_served === penaltyList[i].player_served) {
      return i;
    }
  }
  return -1;
}
