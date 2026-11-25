# What I asked the AI

Keep a short log. One entry per prompt is enough.

| What I asked (paste or summarize) | What happened | What I had to fix or check |
|---|---|---|
| Set up my laptop by checking Node, installing packages, setting up .env, and creating the database. | Confirmed Node v24.13.0 and npm 11.6.2, successfully ran npm install, created .env with DB_NAME=sbabu23_myapp, and ran npm run create-db and npm run check successfully. | Checked that the database was actually connected and working. |
| Build a hiking log page and Express server based on my user story, starting with sample data. | Created the hiking log page (web/index.html) with a form to add hikes, search and filter options, and summary cards. Also created an Express server (server/server.js) running at http://localhost:3000. | Checked the page in the browser and made changes to how hikes are sorted and counted. |
| Show unfinished hikes first and make the "Still to explore" count update correctly. | Updated the page so unfinished hikes appear first. The "Still to explore" count also updates as hikes are added or marked as completed. | Tested adding and completing hikes in the browser to make sure the order and counts updated correctly. |
| Add the SQL tables, sample data, search queries, and connect the page to the database. | Created the Trails and HikeLog tables (db/schema.sql), added around 20 sample rows to each (db/load.js), wrote queries (db/queries.sql). Connected the page to display actual database data. | Restarted the server using npm start, checked that the database rows appeared on the page |
| Test everything with the database, search queries, and user inputs. | Checked that the page displays results for matching searches and tested ' OR 1=1 -- in the search box. | Ran the query in VS Code and checked that the results matched what showed up on the webpage. Tested  in the search box to make sure it didn't return every row.  |