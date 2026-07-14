import { config } from './config.js';
import { createDb } from './db.js';
import { createApp } from './app.js';
const cfg=config(), db=createDb(cfg.databasePath), app=createApp({db,config:cfg});
const server=app.listen(cfg.port,()=>console.log(`Demo casino API listening on http://127.0.0.1:${cfg.port}`));
const stop=()=>server.close(()=>{db.close();process.exit(0)}); process.on('SIGINT',stop);process.on('SIGTERM',stop);
