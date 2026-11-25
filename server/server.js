require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const sql = require('mssql');

const app = express();
const webDirectory = path.join(__dirname, '..', 'web');
const hikeQuery = fs.readFileSync(path.join(__dirname, '..', 'db', 'queries.sql'), 'utf8');
const port = Number(process.env.PORT) || 3000;
const maxPhotoBytes = 2 * 1024 * 1024;
const allowedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const databaseConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(databaseConfig).catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parsePhoto(photoData, photoContentType) {
  if (photoData == null && photoContentType == null) return { buffer: null, error: null };
  if (typeof photoData !== 'string' || !allowedPhotoTypes.has(photoContentType)) {
    return { buffer: null, error: 'Choose a JPEG, PNG, WebP, or GIF photo.' };
  }
  if (photoData.length > Math.ceil(maxPhotoBytes / 3) * 4
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(photoData)) {
    return { buffer: null, error: 'Photo must be 2 MB or smaller.' };
  }

  const buffer = Buffer.from(photoData, 'base64');
  if (buffer.length === 0 || buffer.length > maxPhotoBytes || buffer.toString('base64') !== photoData) {
    return { buffer: null, error: 'Photo must be a valid image no larger than 2 MB.' };
  }
  return { buffer, error: null };
}

app.use(express.json({ limit: '3mb' }));

app.get('/api/trails', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        TrailID AS TrailId,
        TrailName AS Name,
        Region AS Region,
        DistanceMiles AS Miles,
        Difficulty AS Difficulty
      FROM dbo.Trails
      ORDER BY TrailName;
    `);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/hikes', async (req, res, next) => {
  try {
    const search = req.query.search === undefined ? '' : req.query.search;
    if (typeof search !== 'string' || search.length > 100) {
      return res.status(400).json({ error: 'Search must be 100 characters or fewer.' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('search', sql.NVarChar(100), search.trim())
      .query(hikeQuery);
    const hikes = result.recordsets[0].map((hike) => ({
      ...hike,
      PhotoUrl: hike.HasPhoto ? `/api/hikes/${hike.HikeLogId}/photo` : null
    }));
    res.json({ hikes, summary: result.recordsets[1][0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/hikes', async (req, res, next) => {
  try {
    const body = req.body;
    const trailId = Number(body && body.trailId);
    const miles = Number(body && body.miles);
    const scheduledDate = body && body.scheduledDate;

    if (!Number.isInteger(trailId) || trailId < 1) {
      return res.status(400).json({ error: 'Choose a hike from the trail list.' });
    }
    if (!Number.isFinite(miles) || miles <= 0 || miles > 200 || Math.round(miles * 10) !== miles * 10) {
      return res.status(400).json({ error: 'Distance must be between 0.1 and 200 miles, in tenths of a mile.' });
    }
    if (!isValidDate(scheduledDate)) {
      return res.status(400).json({ error: 'Choose a valid hike date.' });
    }

    const photo = parsePhoto(body.photoData, body.photoContentType);
    if (photo.error) return res.status(400).json({ error: photo.error });

    const pool = await getPool();
    const trailResult = await pool.request()
      .input('trailId', sql.Int, trailId)
      .query('SELECT TrailID FROM dbo.Trails WHERE TrailID = @trailId;');
    if (trailResult.recordset.length === 0) {
      return res.status(404).json({ error: 'That trail is no longer available.' });
    }

    const result = await pool.request()
      .input('trailId', sql.Int, trailId)
      .input('scheduledDate', sql.Date, scheduledDate)
      .input('miles', sql.Decimal(5, 1), miles)
      .input('photoData', sql.VarBinary(sql.MAX), photo.buffer)
      .input('photoContentType', sql.NVarChar(100), photo.buffer ? body.photoContentType : null)
      .query(`
        INSERT INTO dbo.HikeLog (TrailID, ScheduledDate, MilesWalked, Status, PhotoData, PhotoContentType)
        OUTPUT INSERTED.HikeLogID AS HikeLogId
        VALUES (@trailId, @scheduledDate, @miles, N'Planned', @photoData, @photoContentType);
      `);

    res.status(201).json({ hikeLogId: result.recordset[0].HikeLogId });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/hikes/:id/complete', async (req, res, next) => {
  try {
    const hikeLogId = Number(req.params.id);
    const completedDate = req.body && req.body.completedDate;
    if (!Number.isInteger(hikeLogId) || hikeLogId < 1 || !isValidDate(completedDate)) {
      return res.status(400).json({ error: 'A valid hike and completion date are required.' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('hikeLogId', sql.Int, hikeLogId)
      .input('completedDate', sql.Date, completedDate)
      .query(`
        UPDATE dbo.HikeLog
        SET Status = N'Completed', CompletedDate = @completedDate
        OUTPUT INSERTED.HikeLogID AS HikeLogId
        WHERE HikeLogID = @hikeLogId AND Status = N'Planned';
      `);

    if (result.recordset.length === 0) {
      const existing = await pool.request()
        .input('hikeLogId', sql.Int, hikeLogId)
        .query('SELECT Status FROM dbo.HikeLog WHERE HikeLogID = @hikeLogId;');
      if (existing.recordset.length === 0) {
        return res.status(404).json({ error: 'That hike was not found.' });
      }
      return res.status(409).json({ error: 'That hike is already marked complete.' });
    }

    res.json({ hikeLogId: result.recordset[0].HikeLogId, status: 'Completed' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/hikes/:id/photo', async (req, res, next) => {
  try {
    const hikeLogId = Number(req.params.id);
    if (!Number.isInteger(hikeLogId) || hikeLogId < 1) {
      return res.status(400).json({ error: 'Invalid hike ID.' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('hikeLogId', sql.Int, hikeLogId)
      .query(`
        SELECT PhotoData, PhotoContentType
        FROM dbo.HikeLog
        WHERE HikeLogID = @hikeLogId;
      `);
    const photo = result.recordset[0];
    if (!photo || !photo.PhotoData) {
      return res.status(404).json({ error: 'No photo is saved for that hike.' });
    }

    res.set('Content-Type', photo.PhotoContentType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    res.send(photo.PhotoData);
  } catch (error) {
    next(error);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use(express.static(webDirectory));

app.use((error, req, res, next) => {
  console.error('Request failed:', error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'The request could not be completed. Check the server terminal for details.' });
});

app.listen(port, () => {
  console.log(`Trail Notes is running at http://localhost:${port}`);
});
