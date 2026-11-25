require('dotenv').config();

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const database = process.env.DB_NAME || '';
if (!/^[A-Za-z][A-Za-z0-9_]*_myapp$/.test(database)) {
  throw new Error('Set DB_NAME in .env to your own database name, ending in _myapp.');
}

const connectionConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database,
  options: { encrypt: true, trustServerCertificate: true }
};

const trails = [
  { name: 'Rattlesnake Ledge', region: 'North Bend', miles: 4.0, gain: 1160, difficulty: 'Moderate', trailhead: 'Rattlesnake Lake Recreation Area' },
  { name: 'Lake Twenty-Two', region: 'Granite Falls', miles: 5.4, gain: 1350, difficulty: 'Moderate', trailhead: 'Mountain Loop Highway' },
  { name: 'Mount Si', region: 'North Bend', miles: 7.5, gain: 3150, difficulty: 'Hard', trailhead: 'Mount Si Trailhead' },
  { name: 'Little Si', region: 'North Bend', miles: 4.7, gain: 1300, difficulty: 'Moderate', trailhead: 'Little Si Trailhead' },
  { name: 'Mailbox Peak', region: 'North Bend', miles: 9.4, gain: 4000, difficulty: 'Hard', trailhead: 'Mailbox Peak Trailhead' },
  { name: 'Twin Falls', region: 'North Bend', miles: 2.6, gain: 500, difficulty: 'Easy', trailhead: 'Twin Falls Trailhead' },
  { name: 'Wallace Falls', region: 'Gold Bar', miles: 5.6, gain: 1300, difficulty: 'Moderate', trailhead: 'Wallace Falls State Park' },
  { name: 'Heather Lake', region: 'Granite Falls', miles: 4.6, gain: 1000, difficulty: 'Moderate', trailhead: 'Heather Lake Trailhead' },
  { name: 'Snow Lake', region: 'Snoqualmie Pass', miles: 7.2, gain: 1800, difficulty: 'Hard', trailhead: 'Alpental Parking Area' },
  { name: 'Teneriffe Falls', region: 'North Bend', miles: 5.6, gain: 1580, difficulty: 'Moderate', trailhead: 'Mount Teneriffe Trailhead' },
  { name: 'Mount Pilchuck', region: 'Granite Falls', miles: 5.4, gain: 2300, difficulty: 'Hard', trailhead: 'Mount Pilchuck Trailhead' },
  { name: 'Oyster Dome', region: 'Bow', miles: 5.2, gain: 1900, difficulty: 'Moderate', trailhead: 'Samish Overlook' },
  { name: 'Lake Serene', region: 'Index', miles: 7.2, gain: 2000, difficulty: 'Hard', trailhead: 'Lake Serene Trailhead' },
  { name: 'Cherry Creek Falls', region: 'Duvall', miles: 5.0, gain: 450, difficulty: 'Easy', trailhead: 'Cherry Creek Falls Trailhead' },
  { name: 'Heather-Maple Pass Loop', region: 'North Cascades', miles: 7.2, gain: 2000, difficulty: 'Hard', trailhead: 'Rainy Pass Trailhead' },
  { name: 'Mount Ellinor', region: 'Olympic Peninsula', miles: 6.2, gain: 3300, difficulty: 'Hard', trailhead: 'Upper Mount Ellinor Trailhead' },
  { name: 'Hoh River to Mineral Creek', region: 'Olympic Peninsula', miles: 5.0, gain: 300, difficulty: 'Easy', trailhead: 'Hoh Rain Forest Visitor Center' },
  { name: 'Hurricane Hill', region: 'Port Angeles', miles: 3.2, gain: 700, difficulty: 'Moderate', trailhead: 'Hurricane Ridge Visitor Center' },
  { name: 'Sol Duc Falls', region: 'Olympic Peninsula', miles: 1.6, gain: 200, difficulty: 'Easy', trailhead: 'Sol Duc Hot Springs Road' },
  { name: 'Mount Townsend', region: 'Olympic Peninsula', miles: 8.0, gain: 3010, difficulty: 'Hard', trailhead: 'Mount Townsend Trailhead' }
];

const hikeEntries = [
  { trail: 'Rattlesnake Ledge', date: '2026-11-08', status: 'Completed', miles: 4.0 },
  { trail: 'Lake Twenty-Two', date: '2026-11-02', status: 'Completed', miles: 5.4 },
  { trail: 'Mount Si', date: '2026-12-06', status: 'Planned', miles: 7.5 },
  { trail: 'Little Si', date: '2026-12-13', status: 'Planned', miles: 4.7 },
  { trail: 'Mailbox Peak', date: '2026-09-20', status: 'Completed', miles: 9.2 },
  { trail: 'Twin Falls', date: '2026-10-18', status: 'Completed', miles: 2.7 },
  { trail: 'Wallace Falls', date: '2026-08-21', status: 'Completed', miles: 5.8 },
  { trail: 'Heather Lake', date: '2026-12-20', status: 'Planned', miles: 4.6 },
  { trail: 'Snow Lake', date: '2026-08-10', status: 'Completed', miles: 7.4 },
  { trail: 'Teneriffe Falls', date: '2027-01-09', status: 'Planned', miles: 5.6 },
  { trail: 'Mount Pilchuck', date: '2026-07-27', status: 'Completed', miles: 5.7 },
  { trail: 'Oyster Dome', date: '2026-10-04', status: 'Completed', miles: 5.4 },
  { trail: 'Lake Serene', date: '2027-01-17', status: 'Planned', miles: 7.2 },
  { trail: 'Cherry Creek Falls', date: '2026-09-12', status: 'Completed', miles: 4.9 },
  { trail: 'Heather-Maple Pass Loop', date: '2026-09-28', status: 'Completed', miles: 7.4 },
  { trail: 'Mount Ellinor', date: '2027-01-24', status: 'Planned', miles: 6.2 },
  { trail: 'Hoh River to Mineral Creek', date: '2027-02-07', status: 'Planned', miles: 5.0 },
  { trail: 'Hurricane Hill', date: '2026-09-01', status: 'Completed', miles: 3.2 },
  { trail: 'Sol Duc Falls', date: '2026-10-11', status: 'Completed', miles: 1.8 },
  { trail: 'Mount Townsend', date: '2027-02-21', status: 'Planned', miles: 8.0 }
];

async function seedRows(pool) {
  const counts = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Trails) AS TrailCount,
      (SELECT COUNT(*) FROM dbo.HikeLog) AS HikeLogCount;
  `);
  const { TrailCount, HikeLogCount } = counts.recordset[0];

  if (TrailCount !== 0 || HikeLogCount !== 0) {
    console.log(`Existing rows found (${TrailCount} trails, ${HikeLogCount} log entries); demo rows were left unchanged.`);
    return;
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const trailIds = new Map();
    for (const trail of trails) {
      const result = await transaction.request()
        .input('name', sql.NVarChar(100), trail.name)
        .input('region', sql.NVarChar(100), trail.region)
        .input('miles', sql.Decimal(5, 1), trail.miles)
        .input('gain', sql.Int, trail.gain)
        .input('difficulty', sql.NVarChar(20), trail.difficulty)
        .input('trailhead', sql.NVarChar(150), trail.trailhead)
        .query(`
          INSERT INTO dbo.Trails (TrailName, Region, DistanceMiles, ElevationGainFeet, Difficulty, Trailhead)
          OUTPUT INSERTED.TrailID AS TrailId
          VALUES (@name, @region, @miles, @gain, @difficulty, @trailhead);
        `);
      trailIds.set(trail.name, result.recordset[0].TrailId);
    }

    for (const hike of hikeEntries) {
      const completedDate = hike.status === 'Completed' ? hike.date : null;
      await transaction.request()
        .input('trailId', sql.Int, trailIds.get(hike.trail))
        .input('scheduledDate', sql.Date, hike.date)
        .input('completedDate', sql.Date, completedDate)
        .input('miles', sql.Decimal(5, 1), hike.miles)
        .input('status', sql.NVarChar(12), hike.status)
        .query(`
          INSERT INTO dbo.HikeLog (TrailID, ScheduledDate, CompletedDate, MilesWalked, Status)
          VALUES (@trailId, @scheduledDate, @completedDate, @miles, @status);
        `);
    }

    await transaction.commit();
    console.log(`Created ${trails.length} trails and ${hikeEntries.length} hike log entries in ${database}.`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function main() {
  const pool = await sql.connect(connectionConfig);
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.request().batch(schema);
    await seedRows(pool);
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error('Failed to create or seed the hiking tables:', error.message);
  process.exitCode = 1;
});
