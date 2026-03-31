import db from './index.js';
db.query('SELECT r.answers FROM "Responses" r WHERE r."surveyId" = 4').then(r => console.log(JSON.stringify(r.rows, null, 2))).catch(console.error).finally(()=>process.exit(0));
