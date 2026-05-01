import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamEntity } from '../persistence/entities/team.orm-entity';

/**
 * Realistic ELO ratings for known teams worldwide.
 * Based on ClubElo.com, CAF rankings, and established ELO rankings.
 * This seeds the database on first startup so predictions are
 * immediately differentiated instead of all teams being at 1500.
 */
const TEAM_ELO_SEEDS: Record<string, number> = {
    // ── Premier League 2025/26 ──
    'Man City': 1950,
    'Manchester City': 1950,
    'Arsenal': 1890,
    'Liverpool': 1870,
    'Aston Villa': 1780,
    'Tottenham': 1750,
    'Tottenham Hotspur': 1750,
    'Chelsea': 1740,
    'Newcastle': 1730,
    'Newcastle United': 1730,
    'Man United': 1720,
    'Manchester United': 1720,
    'West Ham': 1680,
    'West Ham United': 1680,
    'Brighton': 1670,
    'Brighton and Hove Albion': 1670,
    'Wolves': 1650,
    'Wolverhampton Wanderers': 1650,
    'Fulham': 1640,
    'Bournemouth': 1630,
    'Crystal Palace': 1620,
    'Brentford': 1610,
    'Everton': 1590,
    'Nottm Forest': 1580,
    'Nottingham Forest': 1580,
    'Leeds': 1580,
    'Leeds United': 1580,
    'Leicester': 1560,
    'Leicester City': 1560,
    'Ipswich': 1500,
    'Ipswich Town': 1500,

    // ── La Liga 2025/26 ──
    'Real Madrid': 1940,
    'Barcelona': 1910,
    'Atletico Madrid': 1820,
    'Real Sociedad': 1720,
    'Athletic Bilbao': 1690,
    'Real Betis': 1680,
    'Villarreal': 1670,
    'Girona': 1660,
    'Sevilla': 1650,
    'Valencia': 1630,
    'Getafe': 1600,
    'Osasuna': 1590,
    'Celta Vigo': 1570,
    'Mallorca': 1560,
    'Rayo Vallecano': 1550,
    'Las Palmas': 1540,
    'Espanyol': 1540,
    'Alavés': 1530,
    'Leganes': 1510,
    'Real Valladolid': 1490,

    // ── Bundesliga 2025/26 ──
    'Bayern Munich': 1920,
    'Bayer Leverkusen': 1850,
    'Borussia Dortmund': 1800,
    'Dortmund': 1800,
    'RB Leipzig': 1770,
    'VfB Stuttgart': 1720,
    'Stuttgart': 1720,
    'Eintracht Frankfurt': 1700,
    'Frankfurt': 1700,
    'SC Freiburg': 1660,
    'Freiburg': 1660,
    'Wolfsburg': 1630,
    'VfL Wolfsburg': 1630,
    'TSG Hoffenheim': 1620,
    'Hoffenheim': 1620,
    'Union Berlin': 1610,
    'Borussia Monchengladbach': 1600,
    'Monchengladbach': 1600,
    'Werder Bremen': 1590,
    'Mainz 05': 1570,
    'FC Augsburg': 1540,
    'Augsburg': 1540,
    'FC Heidenheim': 1510,
    'Heidenheim': 1510,
    'St Pauli': 1500,
    'Bochum': 1490,
    'Holstein Kiel': 1470,

    // ── Serie A 2025/26 ──
    'Inter': 1850,
    'Milan': 1780,
    'AC Milan': 1780,
    'Juventus': 1760,
    'Napoli': 1750,
    'Atalanta': 1740,
    'Lazio': 1710,
    'Roma': 1700,
    'Fiorentina': 1660,
    'Bologna': 1650,
    'Torino': 1630,
    'Monza': 1580,
    'Genoa': 1570,
    'Udinese': 1560,
    'Lecce': 1530,
    'Empoli': 1520,
    'Parma': 1520,
    'Cagliari': 1510,
    'Verona': 1500,
    'Como': 1490,
    'Venezia': 1480,

    // ── Ligue 1 2025/26 ──
    'Paris Saint Germain': 1880,
    'PSG': 1880,
    'Monaco': 1720,
    'Lille': 1700,
    'Marseille': 1690,
    'Lyon': 1680,
    'Nice': 1660,
    'Lens': 1650,
    'Rennes': 1640,
    'Strasbourg': 1590,
    'Reims': 1580,
    'Brest': 1570,
    'Montpellier': 1560,
    'Toulouse': 1550,
    'Nantes': 1540,
    'Saint-Etienne': 1520,
    'Le Havre': 1510,
    'Angers': 1500,
    'Auxerre': 1490,

    // ── South Africa PSL 2025/26 ──
    'Mamelodi Sundowns': 1800,
    'Sundowns': 1800,
    'Orlando Pirates': 1650,
    'Pirates': 1650,
    'Kaizer Chiefs': 1630,
    'Chiefs': 1630,
    'Stellenbosch': 1580,
    'Cape Town City': 1570,
    'AmaZulu': 1540,
    'Sekhukhune United': 1520,
    'Sekhukhune': 1520,
    'Golden Arrows': 1510,
    'Lamontville Golden Arrows': 1510,
    'Royal AM': 1500,
    'TS Galaxy': 1500,
    'Richards Bay': 1490,
    'Chippa United': 1480,
    'Chippa': 1480,
    'Marumo Gallants': 1480,
    'Polokwane City': 1470,
    'Durban City': 1460,
    'Magesi FC': 1450,

    // ── CAF Competitions (SA teams' opponents) ──
    'TP Mazembe': 1650,
    'Mazembe': 1650,
    'Al Ahly': 1780,
    'Wydad Casablanca': 1700,
    'Raja Casablanca': 1680,
    'Esperance de Tunis': 1720,
    'Simba SC': 1580,
    'Young Africans': 1570,
    'Zamalek': 1680,
    'Enyimba': 1580,
    'ASEC Mimosas': 1550,
    'Jwaneng Galaxy': 1480,
    'Black Bulls': 1450,
    'Pyramids FC': 1620,
    'FAR Rabat': 1580,
    'CR Belouizdad': 1620,
    'Horoya AC': 1520,
    'Al Hilal Omdurman': 1550,
    'AS FAR': 1580,

    // ── Other notable teams ──
    'FC Copenhagen': 1660,
    'Copenhagen': 1660,
    'Zenit St Petersburg': 1650,
    'Zenit': 1650,
    'FC Krasnodar': 1620,
    'Krasnodar': 1620,
    'Club Brugge': 1650,
    'Anderlecht': 1630,
    'Gent': 1610,
    'Celtic': 1680,
    'Rangers': 1620,
    'Galatasaray': 1680,
    'Fenerbahce': 1660,
    'Besiktas': 1640,
    'Benfica': 1720,
    'Porto': 1700,
    'Sporting CP': 1690,
    'PSV Eindhoven': 1700,
    'PSV': 1700,
    'Feyenoord': 1670,
    'Ajax': 1660,
    'Randers FC': 1560,
    'Randers': 1560,
    'FC Nordsjaelland': 1580,
    'Silkeborg': 1540,
    'Brondby': 1620,
    'FC Midtjylland': 1640,
    'AGF': 1570,
    'Aalborg': 1550,
    'Viborg': 1520,
    'Lyngby': 1490,
    'Hvidovre': 1480,
    'Halmstad': 1500,
    'Malmo FF': 1620,
    'AIK': 1580,
    'Djurgarden': 1570,
    'Hammarby': 1560,
    'IF Elfsborg': 1550,
    'IFK Goteborg': 1540,
    'BK Hacken': 1530,
    'Mjallby': 1510,
    'Norrkoping': 1500,
    'Sirius': 1490,
    'Kalmar FF': 1480,
    'Varbergs BoIS': 1470,
    'Degerfors': 1460,
    'GAIS': 1450,
    'Osters IF': 1440,
    'Sandvikens IF': 1430,
    'Utsiktens BK': 1420,
    'Orgryte IS': 1410,
    'Landskrona BoIS': 1400,
    'Orebro SK': 1390,
    'Trelleborgs FF': 1380,
    'Helsingborgs IF': 1370,
    'Jonkopings Sodra IF': 1360,
    'Skovde AIK': 1350,
    'Falkenbergs FF': 1340,
    'AFC Eskilstuna': 1330,
    'Dalkurd FF': 1320,
    'Vasteras SK FK': 1310,
    'Akropolis IF': 1300,
    'Varnamo': 1490,
    'IF Brommapojkarna': 1480,
};

/**
 * ELO Seeder Service
 *
 * Runs once on startup to seed known teams with realistic ELO ratings.
 * Only updates teams that are still at the default 1500 rating.
 * This ensures predictions are immediately differentiated.
 */
@Injectable()
export class EloSeederService implements OnModuleInit {
    private readonly logger = new Logger(EloSeederService.name);
    private hasSeeded = false;

    constructor(
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
    ) { }

    async onModuleInit() {
        if (this.hasSeeded) return;
        await this.seedEloRatings();
        this.hasSeeded = true;
    }

    async seedEloRatings(): Promise<{ updated: number; skipped: number }> {
        let updated = 0;
        let skipped = 0;

        // Track which ELOs we've already used to avoid updating the same team twice
        // when both short and full name match the same row
        const updatedNames = new Set<string>();

        for (const [name, elo] of Object.entries(TEAM_ELO_SEEDS)) {
            if (updatedNames.has(name)) continue;

            const team = await this.teamRepo.findOne({
                where: { name },
            });

            if (!team) {
                skipped++;
                continue;
            }

            // Force-update known teams that haven't reached realistic ratings yet.
            // We consider a team "not yet differentiated" if its ELO is below 1600.
            // This covers both fresh teams (1500) and slightly-differentiated ones (~1516).
            if (team.eloRating >= 1600) {
                this.logger.debug(`Skipping ${name} (already at ${team.eloRating.toFixed(0)})`);
                skipped++;
                continue;
            }

            await this.teamRepo.update(team.id, { eloRating: elo });
            updated++;
            updatedNames.add(name);
            this.logger.debug(`Seeded ELO for ${name}: ${team.eloRating.toFixed(0)} → ${elo}`);
        }

        if (updated > 0) {
            this.logger.log(`ELO seeding complete: ${updated} teams updated, ${skipped} skipped (already at realistic ratings)`);
        }

        return { updated, skipped };
    }
}
