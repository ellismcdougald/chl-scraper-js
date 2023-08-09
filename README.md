# chl-scraper-js

This is a package built for scraping game data from the Canadian Hockey League website.

When using this scraper, please demonstrate care for the Canadian Hockey League's servers.

# Installation

INSTALLATION INSTRUCTIONS

# User Functions

## getLeagueSchedule(startDate, endDate, league)

Returns the league schedule for all games played between the start date and the end date.

- startDate: the start date of the time interval you would like to scrape, string as format 'YYYY-MM-DD'
- endDate, the end date of the time interval you would like to scrape, string as format 'YYYY-MM-DD'
- league: the league whose schedule you would like to scrape, string. One of ('ohl', 'whl', 'lhjmq')

i.e. getLeagueSchedule('2022-09-29', '2023-03-26', 'ohl')

## scrapeGame(gameId, league)

Returns the game info and skater statistics for the game indicated by the given game id and league

- gameId: the chl.ca game id, int
- league: the league the game was played in, string. One of ('ohl', 'whl', 'lhjmq')
<<<<<<< HEAD
=======

i.e. scrapeGame(26459, 'ohl')
>>>>>>> c94f954 (Adds scrapeGame function description with function example)
