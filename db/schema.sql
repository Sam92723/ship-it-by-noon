IF OBJECT_ID(N'dbo.Trails', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Trails (
        TrailID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Trails PRIMARY KEY,
        TrailName NVARCHAR(100) NOT NULL
            CONSTRAINT UQ_Trails_TrailName UNIQUE,
        Region NVARCHAR(100) NOT NULL,
        DistanceMiles DECIMAL(5,1) NOT NULL,
        ElevationGainFeet INT NOT NULL,
        Difficulty NVARCHAR(20) NOT NULL,
        Trailhead NVARCHAR(150) NOT NULL,
        CONSTRAINT CK_Trails_DistanceMiles CHECK (DistanceMiles > 0),
        CONSTRAINT CK_Trails_ElevationGainFeet CHECK (ElevationGainFeet >= 0),
        CONSTRAINT CK_Trails_Difficulty CHECK (Difficulty IN (N'Easy', N'Moderate', N'Hard'))
    );
END;

IF OBJECT_ID(N'dbo.HikeLog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.HikeLog (
        HikeLogID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_HikeLog PRIMARY KEY,
        TrailID INT NOT NULL,
        ScheduledDate DATE NOT NULL,
        CompletedDate DATE NULL,
        MilesWalked DECIMAL(5,1) NOT NULL,
        Status NVARCHAR(12) NOT NULL,
        PhotoData VARBINARY(MAX) NULL,
        PhotoContentType NVARCHAR(100) NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_HikeLog_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_HikeLog_Trails FOREIGN KEY (TrailID)
            REFERENCES dbo.Trails (TrailID),
        CONSTRAINT CK_HikeLog_MilesWalked CHECK (MilesWalked > 0 AND MilesWalked <= 200),
        CONSTRAINT CK_HikeLog_Status CHECK (Status IN (N'Planned', N'Completed')),
        CONSTRAINT CK_HikeLog_CompletionDate CHECK (
            (Status = N'Planned' AND CompletedDate IS NULL)
            OR (Status = N'Completed' AND CompletedDate IS NOT NULL)
        ),
        CONSTRAINT CK_HikeLog_Photo CHECK (
            (PhotoData IS NULL AND PhotoContentType IS NULL)
            OR (PhotoData IS NOT NULL AND PhotoContentType IS NOT NULL)
        )
    );
END;
