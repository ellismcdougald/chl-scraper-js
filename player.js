const axios = require("axios");

async function getPlayer(playerId, league) {
  const jsonData = (await getJsonData(getPlayerJsonUrl(playerId, league)))
    .SiteKit.Player;
  if (jsonData.error) {
    return [playerId, null, null, null, null, null, null, null];
  } else {
    return [
      playerId,
      jsonData.first_name,
      jsonData.last_name,
      jsonData.birthdate.length === 0 ? null : jsonData.birthdate,
      jsonData.height.length === 0 ? null : heightToInches(jsonData.height),
      jsonData.weight.length === 0 ? null : parseInt(jsonData.weight),
      jsonData.shoots,
      jsonData.primary_image,
    ];
  }
}

getPlayer(8596, "ohl").then((result) => console.log(result));

function heightToInches(heightStr) {
  let strParts;
  if (heightStr.includes("'")) {
    strParts = heightStr.split("'");
  } else {
    strParts = heightStr.split(".");
  }
  if (strParts.length === 1) {
    return parseInt(strParts[0]) * 12;
  } else {
    return parseInt(strParts[0]) * 12 + parseInt(strParts[1]);
  }
}

function getPlayerJsonUrl(playerId, league) {
  if (league === "ohl") {
    return `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=player&key=2976319eb44abe94&fmt=json&client_code=ohl&league_code=&lang=en&player_id=${playerId}&category=profile`;
  } else if (league === "whl") {
    return `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=player&key=41b145a848f4bd67&fmt=json&client_code=whl&league_code=&lang=en&player_id=${playerId}&category=profile`;
  } else if (league === "lhjmq") {
    return `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=player&key=f322673b6bcae299&fmt=json&client_code=lhjmq&league_code=&lang=en&player_id=${playerId}&category=profile`;
  } else {
    return null;
  }
}

async function getJsonData(jsonUrl) {
  /*
      Gets the json data for a given url.
      - jsonUrl: the url to get the json data from, string
      */
  const response = await axios.get(jsonUrl);
  return response.data;
}
