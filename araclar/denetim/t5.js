const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');
initSqlJs().then(SQL=>{let t=Date.now();const db=new SQL.Database();c.SQLP_EXEC_SEED(db);console.log('seed',Date.now()-t);const B=db.export();console.log('BASE MB',(B.length/1e6).toFixed(1));
t=Date.now();for(let i=0;i<10;i++){const d=new SQL.Database(B);d.close();}console.log('fresh x10 ms',Date.now()-t);
// in-SQL generation test 150k rows
t=Date.now();db.exec("CREATE TABLE g(id INTEGER PRIMARY KEY, a INTEGER, b TEXT, c REAL); WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<150000) INSERT INTO g SELECT i, (i*1103515245+12345)%2147483648 % 80, datetime('2024-06-01', '+'||((i*7919)%7776000)||' seconds'), ((i*48271)%2147483647)/2147483647.0 FROM n;");console.log('gen150k ms',Date.now()-t);
const B2=db.export();console.log('BASE2 MB',(B2.length/1e6).toFixed(1));t=Date.now();for(let i=0;i<10;i++){const d=new SQL.Database(B2);d.close();}console.log('fresh2 x10 ms',Date.now()-t);});
