# chl-scraper-js

This is a package built for scraping game data from the Canadian Hockey League website.

When using this scraper, please demonstrate care for the Canadian Hockey League's servers.

# Installation

Install using npm.

    $ npm install chl-scraper-js

Once the package is installed, you can import it with require.

    const { getLeagueSchedule, scrapeGame } = require('chl-scraper-js')

# User Functions

## getLeagueSchedule(startDate, endDate, league)

Returns the league schedule for all games played between the start date and the end date.

- startDate: the start date of the time interval you would like to scrape, string as format 'YYYY-MM-DD'
- endDate, the end date of the time interval you would like to scrape, string as format 'YYYY-MM-DD'
- league: the league whose schedule you would like to scrape, string. One of ('ohl', 'whl', 'lhjmq')

This is an asynchronous function.

i.e. `getLeagueSchedule('2022-09-29', '2023-03-26', 'ohl').then((result) => console.log(result))`

## scrapeGame(gameId, league)

Returns the game info and skater statistics for the game indicated by the given game id and league.

- gameId: the chl.ca game id, int
- league: the league the game was played in, string. One of ('ohl', 'whl', 'lhjmq')

This is an asynchronous function.

i.e. `scrapeGame(26459, 'ohl').then((result) => console.log(result))`

# Workflow

Use `getLeagueSchedule` to fetch game details, including game id and league, then call `scrapeGame` to fetch game statistics.

# Contact

Email ecmcdougald@gmail.com for questions or issues.
