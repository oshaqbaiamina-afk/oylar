import db from './index.js';
db.query('SELECT * FROM "Surveys" WHERE id=4').then(r => console.log(JSON.stringify(r.rows[0], null, 2))).catch(console.error).finally(()=>process.exit(0));
