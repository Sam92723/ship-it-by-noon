-- The @search value is supplied by the page and bound as a SQL parameter.
SELECT
    h.HikeLogID AS HikeLogId,
    t.TrailID AS TrailId,
    t.TrailName AS Name,
    t.Region AS Region,
    h.MilesWalked AS Miles,
    CONVERT(CHAR(10), COALESCE(h.CompletedDate, h.ScheduledDate), 23) AS HikeDate,
    h.Status AS Status,
    CONVERT(BIT, CASE WHEN h.PhotoData IS NULL THEN 0 ELSE 1 END) AS HasPhoto
FROM dbo.HikeLog AS h
INNER JOIN dbo.Trails AS t ON t.TrailID = h.TrailID
WHERE @search = N''
    OR t.TrailName LIKE N'%' + @search + N'%'
    OR t.Region LIKE N'%' + @search + N'%'
ORDER BY
    CASE WHEN h.Status = N'Planned' THEN 0 ELSE 1 END,
    CASE WHEN h.Status = N'Planned' THEN h.ScheduledDate END ASC,
    CASE WHEN h.Status = N'Completed' THEN h.CompletedDate END DESC,
    h.HikeLogID DESC;

SELECT
    COUNT(CASE WHEN Status = N'Completed' THEN 1 END) AS CompletedCount,
    COALESCE(SUM(CASE WHEN Status = N'Completed' THEN MilesWalked ELSE 0 END), 0) AS MilesWalked,
    COUNT(CASE WHEN Status = N'Planned' THEN 1 END) AS PlannedCount
FROM dbo.HikeLog;
