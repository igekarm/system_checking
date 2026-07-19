import express from "express";
import { assertExecuteRequest } from "@db-tools/contracts";
import { DEFAULT_LIMITS, validateSql } from "@db-tools/sql-core";
import { postgresqlProvider } from "@db-tools/provider-postgresql";

export function createAppServer({ staticPath }={}) {
  const server=express(); server.disable("x-powered-by"); server.use(express.json({limit:"128kb"}));
  if(staticPath) server.use(express.static(staticPath,{fallthrough:true,index:"index.html"}));
  server.get("/",(_req,res)=>res.json({service:"DB Tools API",status:"ok",ui:"http://127.0.0.1:5173"}));
  server.get("/api/providers",(_req,res)=>res.json([postgresqlProvider]));
  server.get("/api/connections",(_req,res)=>res.json([{id:"demo-postgres",name:"PostgreSQL demo (без соединения)",providerId:"postgresql",status:"mock"}]));
  server.post("/api/query",async(req,res)=>{try{const input=assertExecuteRequest(req.body);const sql=validateSql(input.sql);const started=performance.now();res.json({columns:[{field:"status",label:"Статус"},{field:"sql",label:"SQL"}],rows:[{status:"mock",sql}],rowCount:1,durationMs:Math.round(performance.now()-started),truncated:false,limits:DEFAULT_LIMITS});}catch(error){res.status(400).json({code:"INVALID_QUERY",message:error.message});}});
  server.post("/api/query/:requestId/cancel",(_req,res)=>res.status(202).json({accepted:true})); return server;
}

export function startAppServer({host="127.0.0.1",port=3001,staticPath}={}) { const app=createAppServer({staticPath}); return new Promise((resolve,reject)=>{const httpServer=app.listen(port,host,()=>resolve(httpServer));httpServer.once("error",reject);}); }
