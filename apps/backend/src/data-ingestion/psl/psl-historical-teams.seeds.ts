/**
 * PSL Historical Teams Seeder (1996-2026)
 *
 * Comprehensive list of ALL teams that have played in the PSL since its inception in 1996.
 * Includes defunct clubs, renamed clubs, and current teams.
 *
 * Sources:
 * - PSL official records
 * - Wikipedia PSL history
 * - RSSSF South African football archives
 */

export interface PslTeamSeed {
  name: string;
  shortName?: string;
  elo: number;
  leagueKey: string;
  firstSeason?: string; // e.g., "1996/1997"
  lastSeason?: string; // e.g., "2023/2024" (null if still active)
  defunct?: boolean;
  notes?: string;
}

export const PSL_HISTORICAL_TEAMS: PslTeamSeed[] = [
  // ═══════════════════════════════════════════════════════
  //  CURRENT PSL TEAMS (2025/2026 season)
  // ═══════════════════════════════════════════════════════
  {
    name: 'Mamelodi Sundowns',
    shortName: 'Sundowns',
    elo: 1800,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    notes: 'Most successful PSL club, multiple titles',
  },
  {
    name: 'Orlando Pirates',
    shortName: 'Pirates',
    elo: 1650,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    notes: 'Original founding member',
  },
  {
    name: 'Kaizer Chiefs',
    shortName: 'Chiefs',
    elo: 1630,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    notes: 'Original founding member',
  },
  {
    name: 'Cape Town City',
    shortName: 'CT City',
    elo: 1570,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2016/2017',
    notes: 'Reborn club (bought Vasco da Gamas disk)',
  },
  {
    name: 'Stellenbosch',
    shortName: 'Stellies',
    elo: 1580,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2021/2022',
  },
  {
    name: 'SuperSport United',
    shortName: 'SuperSport',
    elo: 1560,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    notes: '3x PSL Champions',
  },
  {
    name: 'AmaZulu',
    shortName: 'Usuthu',
    elo: 1540,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2009/2010',
  },
  {
    name: 'Golden Arrows',
    shortName: 'Arrows',
    elo: 1510,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2002/2003',
  },
  {
    name: 'Chippa United',
    shortName: 'Chippas',
    elo: 1480,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2012/2013',
  },
  {
    name: 'Sekhukhune United',
    shortName: 'Sekhukhune',
    elo: 1520,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2021/2022',
  },
  {
    name: 'TS Galaxy',
    shortName: 'Galaxy',
    elo: 1500,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2019/2020',
    notes: 'Nedbank Cup winners 2022/2023',
  },
  {
    name: 'Polokwane City',
    shortName: 'Bakgaga',
    elo: 1470,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2013/2014',
  },
  {
    name: 'Moroka Swallows',
    shortName: 'Swallows',
    elo: 1500,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '2022/2023',
    notes: 'Relegated 2023',
  },
  {
    name: 'Richards Bay',
    shortName: 'RBFC',
    elo: 1490,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2022/2023',
  },
  {
    name: 'Marumo Gallants',
    shortName: 'Gallants',
    elo: 1480,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2021/2022',
    lastSeason: '2023/2024',
    notes: 'Relegated 2024',
  },
  {
    name: 'Royal AM',
    shortName: 'Royal',
    elo: 1500,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2020/2021',
    notes: 'Bought Highlands Park disk',
  },

  // ═══════════════════════════════════════════════════════
  //  DEFUNCT / DISBANDED / MERGED CLUBS
  // ═══════════════════════════════════════════════════════
  {
    name: 'Bloemfontein Celtic',
    shortName: 'BFC',
    elo: 1550,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '2022/2023',
    defunct: true,
    notes: 'Disk sold, club dissolved 2023',
  },
  {
    name: 'Platinum Stars',
    shortName: 'Platinum',
    elo: 1540,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2002/2003',
    lastSeason: '2017/2018',
    defunct: true,
    notes: 'Disk sold to TTM, also known as Silver Stars',
  },
  {
    name: 'Bidvest Wits',
    shortName: 'Wits',
    elo: 1560,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2004/2005',
    lastSeason: '2019/2020',
    defunct: true,
    notes: 'Disk sold to University of Pretoria',
  },
  {
    name: 'Highlands Park',
    shortName: 'HP',
    elo: 1520,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2015/2016',
    lastSeason: '2018/2019',
    defunct: true,
    notes: 'Disk sold to Royal AM',
  },
  {
    name: 'Ajax Cape Town',
    shortName: 'Ajax CT',
    elo: 1510,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1999/2000',
    lastSeason: '2019/2020',
    defunct: true,
    notes: 'Became Cape Town Spurs',
  },
  {
    name: 'Mpumalanga Black Aces',
    shortName: 'Aces',
    elo: 1500,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2006/2007',
    lastSeason: '2016/2017',
    defunct: true,
    notes: 'Disk sold to Cape Town City',
  },
  {
    name: 'Free State Stars',
    shortName: 'Stars',
    elo: 1510,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2005/2006',
    lastSeason: '2021/2022',
    defunct: false,
    notes: 'Relegated, also known as Fez United',
  },
  {
    name: 'Maritzburg United',
    shortName: 'MUFC',
    elo: 1500,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2007/2008',
    lastSeason: '2022/2023',
    defunct: false,
    notes: 'Relegated 2023',
  },
  {
    name: 'Vasco da Gama',
    shortName: 'Vasco',
    elo: 1490,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2009/2010',
    lastSeason: '2013/2014',
    defunct: false,
    notes: 'Disk sold to Cape Town City founders',
  },
  {
    name: 'Bay United',
    shortName: 'Bay',
    elo: 1480,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2008/2009',
    lastSeason: '2010/2011',
    defunct: true,
    notes: 'Became FC AK then Black Leopards',
  },
  {
    name: 'Dynamos',
    shortName: 'Dyna',
    elo: 1470,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2006/2007',
    lastSeason: '2007/2008',
    defunct: true,
  },
  {
    name: 'Jomo Cosmos',
    shortName: 'Cosmos',
    elo: 1500,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '2005/2006',
    defunct: false,
    notes: 'Relegated multiple times, founded by Jomo Sono',
  },
  {
    name: 'TTM',
    shortName: 'TTM',
    elo: 1490,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2018/2019',
    lastSeason: '2020/2021',
    defunct: true,
    notes: 'Took over Platinum Stars disk',
  },
  {
    name: 'Ubuntu Cape Town',
    shortName: 'Ubuntu',
    elo: 1480,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2021/2022',
    lastSeason: '2021/2022',
    defunct: true,
    notes: 'One season wonder',
  },
  {
    name: 'Cape Town All Stars',
    shortName: 'All Stars',
    elo: 1490,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2019/2020',
    lastSeason: '2020/2021',
    defunct: true,
  },
  {
    name: 'Black Leopards',
    shortName: 'Leopards',
    elo: 1500,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '2001/2002',
    lastSeason: '2018/2019',
    defunct: false,
    notes: 'Relegated',
  },
  {
    name: 'Ria Stars',
    shortName: 'Stars',
    elo: 1490,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '2001/2002',
    defunct: true,
    notes: 'Became Free State Stars',
  },
  {
    name: 'Germiston Callies',
    shortName: 'Callies',
    elo: 1480,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '1998/1999',
    defunct: true,
  },
  {
    name: 'Witbank Aces',
    shortName: 'Aces',
    elo: 1470,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '1997/1998',
    defunct: true,
  },
  {
    name: 'Giant Blackpool',
    shortName: 'Blackpool',
    elo: 1480,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '1997/1998',
    defunct: true,
  },
  {
    name: 'Queens Park College',
    shortName: 'QPC',
    elo: 1470,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1997/1998',
    lastSeason: '1998/1999',
    defunct: true,
  },
  {
    name: 'Engen Santos',
    shortName: 'Santos',
    elo: 1490,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '2007/2008',
    defunct: true,
    notes: 'Cape Town club, went defunct',
  },
  {
    name: 'Hellenic',
    shortName: 'Hellenic',
    elo: 1480,
    leagueKey: 'soccer_south_africa_psl',
    firstSeason: '1996/1997',
    lastSeason: '1998/1999',
    defunct: true,
  },
];

/**
 * PSL Seasons from 1996 to 2026
 * Used for bulk historical data import
 */
export const PSL_SEASONS: string[] = [
  '1996/1997',
  '1997/1998',
  '1998/1999',
  '1999/2000',
  '2000/2001',
  '2001/2002',
  '2002/2003',
  '2003/2004',
  '2004/2005',
  '2005/2006',
  '2006/2007',
  '2007/2008',
  '2008/2009',
  '2009/2010',
  '2010/2011',
  '2011/2012',
  '2012/2013',
  '2013/2014',
  '2014/2015',
  '2015/2016',
  '2016/2017',
  '2017/2018',
  '2018/2019',
  '2019/2020',
  '2020/2021',
  '2021/2022',
  '2022/2023',
  '2023/2024',
  '2024/2025',
  '2025/2026',
];

/**
 * Tournament configurations for South African football
 */
export const SA_TOURNAMENTS = {
  PSL: {
    key: 'soccer_south_africa_psl',
    name: 'Premier Soccer League',
    type: 'LEAGUE',
    country: 'South Africa',
    since: '1996/1997',
  },
  Nedbank_Cup: {
    key: 'soccer_south_africa_nedbank_cup',
    name: 'Nedbank Cup',
    type: 'CUP',
    country: 'South Africa',
    since: '1971/1972',
  },
  MTN8: {
    key: 'soccer_south_africa_mtn8',
    name: 'MTN 8',
    type: 'CUP',
    country: 'South Africa',
    since: '1972/1973',
    notes: 'Top 8 teams from previous season',
  },
  Carling_Knockout: {
    key: 'soccer_south_africa_carling_knockout',
    name: 'Carling Knockout Cup',
    type: 'CUP',
    country: 'South Africa',
    since: '2014/2015',
  },
  Telkom_Knockout: {
    key: 'soccer_south_africa_telkom_knockout',
    name: 'Telkom Knockout',
    type: 'CUP',
    country: 'South Africa',
    since: '1982/1983',
    lastSeason: '2020/2021',
    notes: 'Defunct',
  },
};

/**
 * PSL Team Name Aliases
 * Maps all historical team name variants to canonical names
 */
export const PSL_TEAM_ALIASES: Record<string, string> = {
  // Mamelodi Sundowns
  'Mamelodi Sundowns': 'Mamelodi Sundowns',
  'Mamelodi Sundowns FC': 'Mamelodi Sundowns',
  'Sundowns': 'Mamelodi Sundowns',

  // Orlando Pirates
  'Orlando Pirates': 'Orlando Pirates',
  'Orlando Pirates FC': 'Orlando Pirates',
  'Pirates': 'Orlando Pirates',

  // Kaizer Chiefs
  'Kaizer Chiefs': 'Kaizer Chiefs',
  'Kaizer Chiefs FC': 'Kaizer Chiefs',
  'Chiefs': 'Kaizer Chiefs',

  // SuperSport United
  'SuperSport United': 'SuperSport United',
  'SuperSport United FC': 'SuperSport United',
  'Supersport United': 'SuperSport United',
  'SuperSport': 'SuperSport United',

  // Cape Town City
  'Cape Town City': 'Cape Town City',
  'Cape Town City FC': 'Cape Town City',
  'CT City': 'Cape Town City',

  // AmaZulu
  'AmaZulu': 'AmaZulu',
  'AmaZulu FC': 'AmaZulu',
  'Usuthu': 'AmaZulu',

  // Golden Arrows
  'Golden Arrows': 'Golden Arrows',
  'Lamontville Golden Arrows': 'Golden Arrows',
  'Golden Arrows FC': 'Golden Arrows',
  'Arrows': 'Golden Arrows',

  // Stellenbosch FC
  'Stellenbosch': 'Stellenbosch',
  'Stellenbosch FC': 'Stellenbosch',
  'Stellies': 'Stellenbosch',

  // Chippa United
  'Chippa United': 'Chippa United',
  'Chippa United FC': 'Chippa United',
  'Chippas': 'Chippa United',

  // Polokwane City
  'Polokwane City': 'Polokwane City',
  'Polokwane City FC': 'Polokwane City',
  'Bakgaga Ba Mphahlele': 'Polokwane City',

  // Bloemfontein Celtic (defunct)
  'Bloemfontein Celtic': 'Bloemfontein Celtic',
  'Bloem Celtic': 'Bloemfontein Celtic',
  'Celtic': 'Bloemfontein Celtic',
  'BFC': 'Bloemfontein Celtic',

  // Free State Stars
  'Free State Stars': 'Free State Stars',
  'FS Stars': 'Free State Stars',
  'Stars': 'Free State Stars',

  // Maritzburg United
  'Maritzburg United': 'Maritzburg United',
  'Maritzburg': 'Maritzburg United',
  'MUFC': 'Maritzburg United',

  // Platinum Stars (defunct)
  'Platinum Stars': 'Platinum Stars',
  'Platinum': 'Platinum Stars',
  'Silver Stars': 'Platinum Stars',

  // TTM
  'TTM': 'TTM',
  'Tshakhuma Tsha Madzivhadila': 'TTM',

  // Highlands Park (defunct)
  'Highlands Park': 'Highlands Park',
  'HP': 'Highlands Park',

  // Bidvest Wits (defunct)
  'Bidvest Wits': 'Bidvest Wits',
  'Wits': 'Bidvest Wits',
  'Wits University': 'Bidvest Wits',

  // University of Pretoria
  'University of Pretoria': 'University of Pretoria',
  'AmaTuks': 'University of Pretoria',
  'Tuks': 'University of Pretoria',

  // Ajax Cape Town (defunct)
  'Ajax Cape Town': 'Ajax Cape Town',
  'Ajax CT': 'Ajax Cape Town',
  'Cape Town Spurs': 'Cape Town Spurs',
  'CT Spurs': 'Cape Town Spurs',

  // Vasco da Gama (SA)
  'Vasco da Gama': 'Vasco da Gama',
  'Vasco': 'Vasco da Gama',

  // Bay United
  'Bay United': 'Bay United',

  // Mpumalanga Black Aces (defunct)
  'Mpumalanga Black Aces': 'Mpumalanga Black Aces',
  'Black Aces': 'Mpumalanga Black Aces',
  'Aces': 'Mpumalanga Black Aces',

  // Dynamos
  'Dynamos': 'Dynamos',

  // Jomo Cosmos
  'Jomo Cosmos': 'Jomo Cosmos',
  'Cosmos': 'Jomo Cosmos',

  // Moroka Swallows
  'Moroka Swallows': 'Moroka Swallows',
  'Swallows': 'Moroka Swallows',
  'Swallows FC': 'Moroka Swallows',

  // Marumo Gallants
  'Marumo Gallants': 'Marumo Gallants',
  'Gallants': 'Marumo Gallants',

  // Richards Bay
  'Richards Bay': 'Richards Bay',
  'Richards Bay FC': 'Richards Bay',
  'RBFC': 'Richards Bay',

  // Royal AM
  'Royal AM': 'Royal AM',
  'Royal AM FC': 'Royal AM',

  // TS Galaxy
  'TS Galaxy': 'TS Galaxy',
  'TS Galaxy FC': 'TS Galaxy',
  'Galaxy': 'TS Galaxy',

  // Sekhukhune United
  'Sekhukhune United': 'Sekhukhune United',
  'Sekhukhune United FC': 'Sekhukhune United',

  // Historical clubs
  'Ubuntu Cape Town': 'Ubuntu Cape Town',
  'Cape Town All Stars': 'Cape Town All Stars',
  'All Stars': 'Cape Town All Stars',
  'Milford': 'Milford',
  'Black Leopards': 'Black Leopards',
  'Leopards': 'Black Leopards',
  'Ria Stars': 'Ria Stars',
  'Germiston Callies': 'Germiston Callies',
  'Callies': 'Germiston Callies',
  'Witbank Aces': 'Witbank Aces',
  'Giant Blackpool': 'Giant Blackpool',
  'Blackpool': 'Giant Blackpool',
  'Queens Park College': 'Queens Park College',
  'QPC': 'Queens Park College',
  'Engen Santos': 'Engen Santos',
  'Santos': 'Engen Santos',
  'Hellenic': 'Hellenic',
};
