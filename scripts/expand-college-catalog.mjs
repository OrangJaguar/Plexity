import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../src/lib/tools/college/college-catalog.json');

const REGION = {
  ME: 'Northeast', NH: 'Northeast', VT: 'Northeast', MA: 'Northeast', RI: 'Northeast',
  CT: 'Northeast', NY: 'Northeast', NJ: 'Northeast', PA: 'Northeast',
  DE: 'South', MD: 'South', DC: 'South', VA: 'South', WV: 'South', KY: 'South',
  TN: 'South', NC: 'South', SC: 'South', GA: 'South', FL: 'South', AL: 'South',
  MS: 'South', LA: 'South', AR: 'South', TX: 'South', OK: 'South',
  OH: 'Midwest', MI: 'Midwest', IN: 'Midwest', IL: 'Midwest', WI: 'Midwest',
  MN: 'Midwest', IA: 'Midwest', MO: 'Midwest', ND: 'Midwest', SD: 'Midwest',
  NE: 'Midwest', KS: 'Midwest',
  MT: 'West', ID: 'West', WY: 'West', CO: 'West', NM: 'West', AZ: 'West',
  UT: 'West', NV: 'West', WA: 'West', OR: 'West', CA: 'West', AK: 'West', HI: 'West',
};

// [id, name, state, city, type, accept%, satLo, satHi, actLo, actHi, platform, rd, ea, ed, testPolicy, tuition, honors, enrollment, setting]
const EXTRA = [
  ['carleton','Carleton College','MN','Northfield','private',0.17,1410,1530,31,34,'Common App','Jan 15',null,'Nov 15','optional',62000,false,2100,'rural'],
  ['oberlin','Oberlin College','OH','Oberlin','private',0.35,1350,1500,30,33,'Common App','Jan 15',null,'Nov 15','optional',61000,false,2900,'suburban'],
  ['kenyon','Kenyon College','OH','Gambier','private',0.37,1320,1480,30,33,'Common App','Jan 15',null,'Nov 15','optional',62000,false,1900,'rural'],
  ['reed','Reed College','OR','Portland','private',0.42,1320,1510,30,34,'Common App','Jan 15',null,'Nov 15','optional',62000,false,1400,'urban'],
  ['harvey-mudd','Harvey Mudd College','CA','Claremont','private',0.13,1490,1570,34,36,'Common App','Jan 5',null,'Nov 15','optional',62000,false,900,'suburban'],
  ['claremont-mckenna','Claremont McKenna College','CA','Claremont','private',0.11,1420,1540,32,35,'Common App','Jan 10',null,'Nov 1','optional',62000,false,1400,'suburban'],
  ['pitzer','Pitzer College','CA','Claremont','private',0.17,1320,1480,30,33,'Common App','Jan 1',null,'Nov 15','optional',60000,false,1100,'suburban'],
  ['scripps','Scripps College','CA','Claremont','private',0.30,1320,1480,30,33,'Common App','Jan 5',null,'Nov 15','optional',60000,false,1100,'suburban'],
  ['barnard','Barnard College','NY','New York','private',0.11,1420,1540,32,35,'Common App','Jan 1',null,'Nov 1','optional',64000,false,3100,'urban'],
  ['smith','Smith College','MA','Northampton','private',0.30,1320,1480,30,33,'Common App','Jan 15',null,'Nov 15','optional',61000,false,2500,'suburban'],
  ['mount-holyoke','Mount Holyoke College','MA','South Hadley','private',0.52,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',61000,false,2200,'suburban'],
  ['bryn-mawr','Bryn Mawr College','PA','Bryn Mawr','private',0.31,1320,1480,30,33,'Common App','Jan 15',null,'Nov 15','optional',61000,false,1800,'suburban'],
  ['trinity-ct','Trinity College','CT','Hartford','private',0.43,1280,1450,28,32,'Common App','Feb 1',null,'Nov 15','optional',62000,false,2200,'urban'],
  ['connecticut-college','Connecticut College','CT','New London','private',0.38,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',62000,false,1900,'suburban'],
  ['union-ny','Union College','NY','Schenectady','private',0.47,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',61000,false,2200,'suburban'],
  ['lafayette','Lafayette College','PA','Easton','private',0.38,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',60000,false,2600,'suburban'],
  ['dickinson','Dickinson College','PA','Carlisle','private',0.45,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',61000,false,2300,'suburban'],
  ['gettysburg','Gettysburg College','PA','Gettysburg','private',0.48,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',60000,false,2300,'suburban'],
  ['muhlenberg','Muhlenberg College','PA','Allentown','private',0.66,1180,1380,26,31,'Common App','Feb 1',null,'Nov 15','optional',58000,false,2200,'suburban'],
  ['franklin-marshall','Franklin & Marshall College','PA','Lancaster','private',0.40,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',62000,false,2000,'suburban'],
  ['depauw','DePauw University','IN','Greencastle','private',0.58,1180,1380,26,31,'Common App','Feb 1',null,'Nov 15','optional',58000,false,2100,'rural'],
  ['denison','Denison University','OH','Granville','private',0.28,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',61000,false,2400,'rural'],
  ['ohio-wesleyan','Ohio Wesleyan University','OH','Delaware','private',0.68,1100,1330,23,29,'Common App','Rolling',null,null,'optional',52000,false,1500,'suburban'],
  ['miami-oh','Miami University','OH','Oxford','private',0.88,1180,1380,25,30,'Common App','Feb 1',null,'Nov 1','optional',17000,true,17000,'rural'],
  ['uconn','University of Connecticut','CT','Storrs','public',0.56,1240,1430,27,32,'Common App','Jan 15',null,null,'optional',18000,true,19000,'rural'],
  ['uvm','University of Vermont','VT','Burlington','public',0.64,1180,1380,26,31,'Common App','Jan 15',null,null,'optional',19000,true,12000,'suburban'],
  ['unh','University of New Hampshire','NH','Durham','public',0.87,1080,1280,22,28,'Common App','Feb 1',null,null,'optional',18000,true,12000,'suburban'],
  ['uri','University of Rhode Island','RI','Kingston','public',0.76,1080,1280,22,28,'Common App','Feb 1',null,null,'optional',16000,true,15000,'suburban'],
  ['umass-amherst','University of Massachusetts Amherst','MA','Amherst','public',0.58,1240,1430,27,32,'Common App','Jan 15',null,null,'optional',17000,true,24000,'suburban'],
  ['binghamton','Binghamton University','NY','Binghamton','public',0.38,1320,1480,29,33,'Common App','Jan 15',null,'Nov 1','optional',10000,true,14000,'suburban'],
  ['stony-brook','Stony Brook University','NY','Stony Brook','public',0.48,1240,1430,27,32,'Common App','Jan 15',null,null,'optional',10000,true,18000,'suburban'],
  ['buffalo','University at Buffalo','NY','Buffalo','public',0.68,1140,1360,24,29,'Common App','Feb 1',null,null,'optional',10000,true,22000,'urban'],
  ['cuny-baruch','Baruch College (CUNY)','NY','New York','public',0.43,1240,1420,26,31,'CUNY App','Feb 1',null,null,'optional',7500,false,19000,'urban'],
  ['cuny-hunter','Hunter College (CUNY)','NY','New York','public',0.48,1140,1360,24,29,'CUNY App','Feb 1',null,null,'optional',7500,false,17000,'urban'],
  ['fordham','Fordham University','NY','Bronx','private',0.54,1280,1450,28,32,'Common App','Jan 3',null,'Nov 1','optional',58000,false,10000,'urban'],
  ['hofstra','Hofstra University','NY','Hempstead','private',0.68,1140,1360,24,29,'Common App','Rolling',null,null,'optional',52000,false,7000,'suburban'],
  ['st-johns','St. John\'s University','NY','Queens','private',0.72,1080,1280,22,28,'Common App','Rolling',null,null,'optional',48000,false,15000,'urban'],
  ['howard','Howard University','DC','Washington','private',0.36,1180,1380,25,30,'Common App','Feb 1',null,'Nov 1','optional',32000,false,10000,'urban'],
  ['spelman','Spelman College','GA','Atlanta','private',0.28,1080,1280,22,28,'Common App','Feb 1',null,'Nov 1','optional',28000,false,2200,'urban'],
  ['morehouse','Morehouse College','GA','Atlanta','private',0.58,980,1180,19,25,'Common App','Feb 1',null,'Nov 1','optional',28000,false,2200,'urban'],
  ['hampton','Hampton University','VA','Hampton','private',0.36,980,1180,19,25,'Common App','Rolling',null,null,'optional',28000,false,3500,'suburban'],
  ['xavier-la','Xavier University of Louisiana','LA','New Orleans','private',0.62,1080,1280,22,28,'Common App','Rolling',null,null,'optional',26000,false,2500,'urban'],
  ['ncat','North Carolina A&T State University','NC','Greensboro','public',0.76,980,1180,19,25,'Common App','Rolling',null,null,'optional',7000,true,11000,'urban'],
  ['famu','Florida A&M University','FL','Tallahassee','public',0.35,980,1180,19,25,'Common App','Rolling',null,null,'optional',6000,true,8000,'urban'],
  ['gonzaga','Gonzaga University','WA','Spokane','private',0.68,1180,1380,26,31,'Common App','Feb 1',null,'Nov 1','optional',52000,false,5200,'urban'],
  ['loyola-chicago','Loyola University Chicago','IL','Chicago','private',0.68,1140,1360,24,29,'Common App','Rolling',null,'Nov 1','optional',50000,false,12000,'urban'],
  ['marquette','Marquette University','WI','Milwaukee','private',0.78,1140,1360,24,29,'Common App','Rolling',null,'Nov 1','optional',48000,false,8000,'urban'],
  ['depaul','DePaul University','IL','Chicago','private',0.70,1080,1280,22,28,'Common App','Rolling',null,'Nov 15','optional',44000,false,14000,'urban'],
  ['butler','Butler University','IN','Indianapolis','private',0.78,1140,1360,24,29,'Common App','Feb 1',null,'Nov 1','optional',46000,false,5000,'urban'],
  ['creighton','Creighton University','NE','Omaha','private',0.78,1140,1360,24,29,'Common App','Rolling',null,'Nov 1','optional',46000,false,4500,'urban'],
  ['drake','Drake University','IA','Des Moines','private',0.68,1140,1360,24,29,'Common App','Rolling',null,null,'optional',48000,false,3000,'urban'],
  ['saint-louis','Saint Louis University','MO','St. Louis','private',0.70,1140,1360,24,29,'Common App','Rolling',null,'Nov 1','optional',50000,false,8000,'urban'],
  ['xavier-oh','Xavier University','OH','Cincinnati','private',0.76,1080,1280,22,28,'Common App','Rolling',null,null,'optional',46000,false,4500,'urban'],
  ['dayton','University of Dayton','OH','Dayton','private',0.74,1140,1360,24,29,'Common App','Rolling',null,'Nov 1','optional',48000,false,8000,'suburban'],
  ['miami-fl','University of Miami','FL','Coral Gables','private',0.19,1320,1470,30,33,'Common App','Jan 1','Nov 1',null,'optional',58180,false,12000,'suburban'],
  ['fiu','Florida International University','FL','Miami','public',0.64,1080,1280,22,27,'Common App','Rolling',null,null,'optional',7000,true,40000,'urban'],
  ['fau','Florida Atlantic University','FL','Boca Raton','public',0.78,1080,1280,22,27,'Common App','Rolling',null,null,'optional',6000,true,25000,'suburban'],
  ['usf','University of South Florida','FL','Tampa','public',0.44,1160,1340,24,29,'Common App','Rolling',null,null,'optional',6500,true,38000,'urban'],
  ['ucf','University of Central Florida','FL','Orlando','public',0.41,1160,1340,24,29,'Common App','May 1',null,null,'optional',7000,true,60000,'suburban'],
  ['georgia-state','Georgia State University','GA','Atlanta','public',0.67,1080,1280,22,27,'Common App','Rolling',null,null,'optional',9000,true,27000,'urban'],
  ['georgia-southern','Georgia Southern University','GA','Statesboro','public',0.91,980,1180,19,25,'Common App','Rolling',null,null,'optional',7000,true,24000,'suburban'],
  ['appalachian-state','Appalachian State University','NC','Boone','public',0.80,1080,1280,22,28,'Common App','Rolling',null,null,'optional',8000,true,20000,'suburban'],
  ['nc-state','North Carolina State University','NC','Raleigh','public',0.47,1280,1460,28,32,'Common App','Jan 15',null,'Nov 1','optional',9000,true,28000,'urban'],
  ['wake-forest','Wake Forest University','NC','Winston-Salem','private',0.25,1350,1490,30,33,'Common App','Jan 1',null,null,'optional',62320,false,5500,'suburban'],
  ['elon','Elon University','NC','Elon','private',0.78,1180,1380,26,31,'Common App','Jan 10',null,'Nov 1','optional',44000,false,6400,'suburban'],
  ['high-point','High Point University','NC','High Point','private',0.76,1080,1280,22,28,'Common App','Rolling',null,null,'optional',42000,false,5000,'suburban'],
  ['citadel','The Citadel','SC','Charleston','public',0.82,1080,1280,22,28,'Common App','Feb 1',null,null,'optional',12000,true,2800,'urban'],
  ['college-of-charleston','College of Charleston','SC','Charleston','public',0.78,1140,1360,24,29,'Common App','Rolling',null,null,'optional',12000,true,10000,'urban'],
  ['auburn','Auburn University','AL','Auburn','public',0.71,1150,1330,25,30,'Common App','Feb 1',null,null,'optional',12000,true,25000,'suburban'],
  ['alabama','University of Alabama','AL','Tuscaloosa','public',0.80,1080,1330,23,30,'Common App','Rolling',null,null,'optional',12000,true,32000,'suburban'],
  ['ole-miss','University of Mississippi','MS','Oxford','public',0.88,1080,1280,22,28,'Common App','Rolling',null,null,'optional',9000,true,18000,'rural'],
  ['mississippi-state','Mississippi State University','MS','Starkville','public',0.80,1080,1280,22,28,'Common App','Rolling',null,null,'optional',9000,true,18000,'rural'],
  ['arkansas','University of Arkansas','AR','Fayetteville','public',0.78,1080,1280,22,28,'Common App','Rolling',null,null,'optional',9000,true,24000,'suburban'],
  ['louisiana-tech','Louisiana Tech University','LA','Ruston','public',0.64,1080,1280,22,28,'Common App','Rolling',null,null,'optional',10000,true,11000,'rural'],
  ['tulsa','University of Tulsa','OK','Tulsa','private',0.41,1180,1380,26,31,'Common App','Rolling',null,'Nov 1','optional',48000,false,2800,'urban'],
  ['oklahoma-state','Oklahoma State University','OK','Stillwater','public',0.71,1080,1280,22,28,'Common App','Rolling',null,null,'optional',9000,true,21000,'suburban'],
  ['utah','University of Utah','UT','Salt Lake City','public',0.89,1140,1360,24,29,'Common App','Rolling',null,null,'optional',9000,true,26000,'urban'],
  ['utah-state','Utah State University','UT','Logan','public',0.91,980,1180,19,25,'Common App','Rolling',null,null,'optional',8000,true,24000,'rural'],
  ['colorado-state','Colorado State University','CO','Fort Collins','public',0.90,1080,1280,22,28,'Common App','Rolling',null,null,'optional',12000,true,26000,'suburban'],
  ['colorado-mines','Colorado School of Mines','CO','Golden','public',0.60,1320,1480,29,33,'Common App','Jan 15',null,'Nov 1','optional',20000,false,5500,'suburban'],
  ['unm','University of New Mexico','NM','Albuquerque','public',0.96,980,1180,19,25,'Common App','Rolling',null,null,'optional',9000,true,18000,'urban'],
  ['nau','Northern Arizona University','AZ','Flagstaff','public',0.86,1080,1280,22,28,'Common App','Rolling',null,null,'optional',12000,true,25000,'suburban'],
  ['unlv','University of Nevada, Las Vegas','NV','Las Vegas','public',0.85,980,1180,19,25,'Common App','Rolling',null,null,'optional',9000,true,25000,'urban'],
  ['unr','University of Nevada, Reno','NV','Reno','public',0.88,1080,1280,22,28,'Common App','Rolling',null,null,'optional',9000,true,20000,'suburban'],
  ['boise-state','Boise State University','ID','Boise','public',0.83,980,1180,19,25,'Common App','Rolling',null,null,'optional',8000,true,22000,'urban'],
  ['montana','University of Montana','MT','Missoula','public',0.94,980,1180,19,25,'Common App','Rolling',null,null,'optional',8000,true,9000,'suburban'],
  ['wyoming','University of Wyoming','WY','Laramie','public',0.96,980,1180,19,25,'Common App','Rolling',null,null,'optional',6000,true,10000,'rural'],
  ['hawaii-manoa','University of Hawaii at Manoa','HI','Honolulu','public',0.70,1080,1280,22,28,'Common App','Rolling',null,null,'optional',12000,true,14000,'urban'],
  ['alaska-anchorage','University of Alaska Anchorage','AK','Anchorage','public',0.80,980,1180,19,25,'Common App','Rolling',null,null,'optional',8000,true,11000,'urban'],
  ['uc-riverside','University of California, Riverside','CA','Riverside','public',0.69,1080,1280,22,28,'UC Application','Nov 30',null,null,'blind',14000,false,22000,'suburban'],
  ['uc-merced','University of California, Merced','CA','Merced','public',0.89,1080,1280,22,28,'UC Application','Nov 30',null,null,'blind',14000,false,9000,'suburban'],
  ['ucsc','University of California, Santa Cruz','CA','Santa Cruz','public',0.47,1180,1380,25,31,'UC Application','Nov 30',null,null,'blind',14000,false,17000,'suburban'],
  ['cal-poly-slo','Cal Poly San Luis Obispo','CA','San Luis Obispo','public',0.30,1240,1420,27,31,'Cal State Apply','Dec 1',null,null,'optional',8000,true,21000,'suburban'],
  ['cal-poly-pomona','Cal Poly Pomona','CA','Pomona','public',0.55,1080,1280,22,28,'Cal State Apply','Dec 1',null,null,'optional',8000,true,24000,'suburban'],
  ['chapman','Chapman University','CA','Orange','private',0.58,1240,1420,27,31,'Common App','Jan 15',null,'Nov 1','optional',60000,false,7500,'suburban'],
  ['occidental','Occidental College','CA','Los Angeles','private',0.38,1320,1480,30,33,'Common App','Jan 10',null,'Nov 15','optional',62000,false,2000,'urban'],
  ['redlands','University of Redlands','CA','Redlands','private',0.68,1080,1280,22,28,'Common App','Rolling',null,null,'optional',56000,false,2500,'suburban'],
  ['whitman','Whitman College','WA','Walla Walla','private',0.48,1280,1450,28,32,'Common App','Jan 15',null,'Nov 15','optional',58000,false,1500,'rural'],
  ['puget-sound','University of Puget Sound','WA','Tacoma','private',0.58,1180,1380,26,31,'Common App','Jan 15',null,'Nov 1','optional',56000,false,2200,'suburban'],
  ['seattle-u','Seattle University','WA','Seattle','private',0.78,1140,1360,24,29,'Common App','Rolling',null,'Nov 1','optional',52000,false,4500,'urban'],
  ['willamette','Willamette University','OR','Salem','private',0.78,1140,1360,24,29,'Common App','Rolling',null,'Nov 1','optional',56000,false,2200,'suburban'],
  ['lewis-clark','Lewis & Clark College','OR','Portland','private',0.68,1240,1420,27,31,'Common App','Jan 15',null,'Nov 1','optional',58000,false,2200,'suburban'],
  ['pacific','University of the Pacific','CA','Stockton','private',0.66,1140,1360,24,29,'Common App','Rolling',null,'Nov 15','optional',54000,false,3500,'suburban'],
  ['texas-tech','Texas Tech University','TX','Lubbock','public',0.70,1080,1280,22,28,'ApplyTexas','Rolling',null,null,'optional',11000,true,32000,'urban'],
  ['uh','University of Houston','TX','Houston','public',0.66,1080,1280,22,28,'ApplyTexas','Rolling',null,null,'optional',9000,true,37000,'urban'],
  ['ut-dallas','University of Texas at Dallas','TX','Richardson','public',0.79,1240,1420,26,31,'ApplyTexas','Rolling',null,null,'optional',14000,true,20000,'suburban'],
  ['ut-san-antonio','University of Texas at San Antonio','TX','San Antonio','public',0.84,980,1180,19,25,'ApplyTexas','Rolling',null,null,'optional',9000,true,34000,'urban'],
  ['utep','University of Texas at El Paso','TX','El Paso','public',0.100,980,1180,19,25,'ApplyTexas','Rolling',null,null,'optional',9000,true,22000,'urban'],
  ['rice','Rice University','TX','Houston','private',0.09,1500,1570,33,35,'Common App','Jan 4',null,'Nov 1','optional',58128,false,4500,'urban'],
  ['trinity-tx','Trinity University','TX','San Antonio','private',0.28,1280,1450,28,32,'Common App','Feb 1',null,'Nov 1','optional',50000,false,2600,'urban'],
  ['southwestern','Southwestern University','TX','Georgetown','private',0.52,1180,1380,26,31,'Common App','Feb 1',null,'Nov 1','optional',48000,false,1500,'suburban'],
  ['west-point','United States Military Academy','NY','West Point','public',0.10,1240,1420,27,31,'West Point App','Rolling',null,null,'required',0,false,4400,'rural'],
  ['naval-academy','United States Naval Academy','MD','Annapolis','public',0.09,1240,1420,27,31,'Naval Academy App','Rolling',null,null,'required',0,false,4500,'suburban'],
  ['air-force','United States Air Force Academy','CO','Colorado Springs','public',0.12,1240,1420,27,31,'USAFA App','Rolling',null,null,'required',0,false,4400,'suburban'],
  ['coast-guard','United States Coast Guard Academy','CT','New London','public',0.15,1240,1420,27,31,'CGA App','Rolling',null,null,'required',0,false,1100,'suburban'],
  ['parsons','Parsons School of Design','NY','New York','private',0.35,1180,1380,25,30,'Common App','Jan 15',null,'Nov 1','optional',56000,false,4500,'urban'],
  ['risd','Rhode Island School of Design','RI','Providence','private',0.20,1280,1450,28,32,'Common App','Jan 15',null,'Nov 1','optional',58000,false,2000,'urban'],
  ['pratt','Pratt Institute','NY','Brooklyn','private',0.52,1180,1380,25,30,'Common App','Feb 1',null,'Nov 1','optional',56000,false,3500,'urban'],
  ['scad','Savannah College of Art and Design','GA','Savannah','private',0.72,980,1180,19,25,'Common App','Rolling',null,null,'optional',40000,false,12000,'urban'],
  ['babson','Babson College','MA','Wellesley','private',0.20,1320,1480,30,33,'Common App','Jan 2',null,'Nov 1','optional',58000,false,2400,'suburban'],
  ['bentley','Bentley University','MA','Waltham','private',0.58,1240,1420,27,31,'Common App','Jan 7',null,'Nov 1','optional',56000,false,4200,'suburban'],
  ['wake-forest','Wake Forest University','NC','Winston-Salem','private',0.25,1350,1490,30,33,'Common App','Jan 1',null,null,'optional',62320,false,5500,'suburban'],
];

function toEntry(row) {
  const [
    id, name, state, city, type, acceptanceRate, satLo, satHi, actLo, actHi,
    platform, rd, ea, ed, testPolicy, tuition, honorsCollege, enrollment, setting,
  ] = row;
  return {
    id, name, state, city, type, acceptanceRate,
    satMid50: [satLo, satHi],
    actMid50: [actLo, actHi],
    platform,
    rdDeadline: rd,
    eaDeadline: ea,
    edDeadline: ed,
    testPolicy,
    tuition,
    honorsCollege,
    enrollment,
    setting,
    region: REGION[state] || null,
  };
}

const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const byId = new Map(existing.map((c) => [c.id, c]));

for (const row of EXTRA) {
  const entry = toEntry(row);
  if (!byId.has(entry.id)) {
    byId.set(entry.id, entry);
  }
}

// Enrich existing entries with region where missing
for (const c of byId.values()) {
  if (!c.region && c.state) c.region = REGION[c.state] || null;
}

const merged = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(outPath, JSON.stringify(merged));
console.log('Catalog size:', merged.length);
