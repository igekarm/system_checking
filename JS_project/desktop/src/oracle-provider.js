import { validateSql } from "@db-tools/sql-core";

export function oracleConnectString(profile){
  const mode=profile.oracleConnectionType??(String(profile.connectString??"").trim()?"connectString":"serviceName");
  if(mode==="connectString")return normalizeOracleConnectString(profile.connectString);
  if(mode==="sid")return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${profile.host})(PORT=${Number(profile.port||1521)}))(CONNECT_DATA=(SID=${profile.sid})))`;
  return `${profile.host}:${Number(profile.port||1521)}/${profile.serviceName}`;
}

export function normalizeOracleConnectString(value){const original=String(value??"").trim();const jdbcPrefix="jdbc:oracle:thin:@";if(!original.toLowerCase().startsWith(jdbcPrefix))return original;const target=original.slice(jdbcPrefix.length);if(target.startsWith("//"))return target.slice(2);const sidMatch=target.match(/^([^:()]+):(\d+):([^:()]+)$/);if(sidMatch){const[,host,port,sid]=sidMatch;return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SID=${sid})))`}return target;}

function friendlyOracleError(error){if(error?.code==="NJS-518"||/NJS-518/.test(String(error?.message)))return new Error("Listener Oracle доступен, но указанное имя сервиса не зарегистрировано. Проверьте режим подключения: Service name, SID или полный connect descriptor",{cause:error});return error;}

export class OracleProvider {
  constructor(secretStore,installer){this.secretStore=secretStore;this.installer=installer;this.running=new Map();}
  async connect(profile,passwordOverride,timeoutMs){const driver=await this.installer.loadOracleDriver();const password=passwordOverride?.length?passwordOverride:await this.secretStore.get(profile.id);try{const connection=await driver.getConnection({user:profile.user,password,connectString:oracleConnectString(profile)});connection.callTimeout=Math.max(1000,Math.min(Number(timeoutMs)||15000,300000));return {driver,connection};}catch(error){throw friendlyOracleError(error)}}
  async test(profile,passwordOverride){const started=performance.now();const {driver,connection}=await this.connect(profile,passwordOverride,10000);try{const result=await connection.execute("select sys_context('USERENV','DB_NAME') as DATABASE_NAME, sys_context('USERENV','CURRENT_USER') as USER_NAME from dual",[],{outFormat:driver.OUT_FORMAT_OBJECT});const row=result.rows?.[0]??{};return {database:row.DATABASE_NAME,user:row.USER_NAME,durationMs:Math.round(performance.now()-started),mode:"Thin"};}finally{await connection.close().catch(()=>{})}}
  async execute({requestId,profile,sql,timeoutMs=15000,rowLimit=1000}){const statement=validateSql(sql);const started=performance.now();const {driver,connection}=await this.connect(profile,null,timeoutMs);this.running.set(requestId,connection);try{const result=await connection.execute(statement,[],{outFormat:driver.OUT_FORMAT_ARRAY,maxRows:rowLimit+1});const values=result.rows??[];const columns=(result.metaData??[]).map((field)=>({field:field.name,label:field.name,dataType:field.dbTypeName}));const rows=values.slice(0,rowLimit).map((row)=>Object.fromEntries(columns.map((field,index)=>[field.field,row[index]])));return {columns,rows,rowCount:result.rowsAffected??rows.length,durationMs:Math.round(performance.now()-started),truncated:values.length>rowLimit,command:result.rows?"SELECT":"SQL"};}finally{this.running.delete(requestId);await connection.close().catch(()=>{})}}
  async cancel(requestId){const connection=this.running.get(requestId);if(!connection)return false;await connection.break();return true;}
}
