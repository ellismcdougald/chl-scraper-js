# chl-scraper-js

This is a package built for scraping game data from the Canadian Hockey League website.

When using this scraper, please demonstrate care for the Canadian Hockey League's servers.

# Installation

INSTALLATION INSTRUCTIONS

# User Functions

## getLeagueSchedule(startDate, endDate, league)

Returns the league schedule for all games played between the start date and the end date. - startDate: the start date of the time interval you would like to scrape, string as format 'YYYY-MM-DD' - endDate, the end date of the time interval you would like to scrape, string as format 'YYYY-MM-DD' - league: the league whose schedule you would like to scrape, string. One of ('ohl', 'whl', 'lhjmq')

i.e. getLeagueSchedule('2022-09-29', '2023-03-26', 'ohl')
