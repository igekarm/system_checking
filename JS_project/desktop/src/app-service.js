import { randomUUID } from "node:crypto";
import { JsonStore } from "./json-store.js";
import { SecretStore } from "./secret-store.js";
import { PostgreSqlProvider } from "./postgresql-provider.js";
import { OracleProvider } from "./oracle-provider.js";
import { ProviderInstaller } from "./provider-installer.js";

const clean=(value)=>String(value??"").trim();
const KNOWN_PROVIDERS=new Set(["postgresql","oracle"]);

export class AppService {
  constructor(userDataPath,{logger}={}){
    this.connections=new JsonStore(userDataPath,"connections",[]);
    this.queries=new JsonStore(userDataPath,"queries",[]);
    this.settings=new JsonStore(userDataPath,"settings",{theme:"dark",defaultTimeoutMs:15000,rowLimit:1000,enabledProviders:["postgresql"]});
    this.history=new JsonStore(userDataPath,"history",[]);
    this.secrets=new SecretStore(userDataPath);
    this.providerInstaller=new ProviderInstaller(userDataPath,{logger});
    this.providers={postgresql:new PostgreSqlProvider(this.secrets),oracle:new OracleProvider(this.secrets,this.providerInstaller)};
  }
  async listProviders(){return this.providerInstaller.list();}
  async installProvider(providerId){return this.providerInstaller.install(providerId);}
  async listConnections(){return this.connections.read();}
  validateConnection(input){
    const providerId=input.providerId||"postgresql";
    if(!KNOWN_PROVIDERS.has(providerId))throw new Error("Неизвестный provider СУБД");
    const requestedMode=input.sslMode??(input.ssl?"prefer":"disable");
    const value={id:input.id||randomUUID(),name:clean(input.name),providerId,host:clean(input.host),port:Number(input.port||(providerId==="oracle"?1521:5432)),user:clean(input.user),updatedAt:new Date().toISOString()};
    if(providerId==="oracle"){
      value.oracleConnectionType=["serviceName","sid","connectString"].includes(input.oracleConnectionType)?input.oracleConnectionType:(clean(input.connectString)?"connectString":"serviceName");
      value.serviceName=clean(input.serviceName);
      value.sid=clean(input.sid);
      value.connectString=clean(input.connectString);
      const targetValid=value.oracleConnectionType==="connectString"?Boolean(value.connectString):value.oracleConnectionType==="sid"?Boolean(value.host&&value.sid):Boolean(value.host&&value.serviceName);
      if(!value.name||!value.user||!targetValid)throw new Error("Заполните название, пользователя и параметры выбранного режима подключения Oracle");
      if(value.oracleConnectionType!=="connectString"&&/[()]/.test(`${value.host}${value.serviceName}${value.sid}`))throw new Error("Параметры Oracle содержат недопустимые скобки; используйте режим полного connect descriptor");
    }else{
      value.database=clean(input.database);
      value.sslMode=["disable","prefer","require","verify-full"].includes(requestedMode)?requestedMode:"prefer";
      if(!value.name||!value.host||!value.database||!value.user)throw new Error("Заполните название, сервер, базу данных и пользователя");
    }
    if((providerId!=="oracle"||value.oracleConnectionType!=="connectString")&&(!Number.isInteger(value.port)||value.port<1||value.port>65535))throw new Error("Некорректный порт");
    return value;
  }
  async ensureProviderEnabled(providerId){const settings=await this.getSettings();if(!settings.enabledProviders.includes(providerId))throw new Error(`${providerId==="oracle"?"Oracle":"PostgreSQL"} отключён в настройках`);if(providerId==="oracle"&&!await this.providerInstaller.isOracleInstalled())throw new Error("Oracle provider не установлен. Включите Oracle в настройках приложения");}
  async saveConnection(input){const value=this.validateConnection(input);await this.ensureProviderEnabled(value.providerId);await this.connections.update((items)=>[value,...items.filter((item)=>item.id!==value.id)]);if(typeof input.password==="string"&&input.password.length)await this.secrets.set(value.id,input.password);return value;}
  async deleteConnection(id){await this.connections.update((items)=>items.filter((item)=>item.id!==id));await this.secrets.delete(id);return true;}
  async findConnection(id){const value=(await this.connections.read()).find((item)=>item.id===id);if(!value)throw new Error("Подключение не найдено");return value;}
  async testConnection(input){const value=this.validateConnection(input);await this.ensureProviderEnabled(value.providerId);return this.providers[value.providerId].test(value,input.password);}
  async listQueries(){return this.queries.read();}
  async saveQuery(input){const value={id:input.id||randomUUID(),name:clean(input.name),sql:String(input.sql??""),providerId:input.providerId||"postgresql",connectionId:input.connectionId||null,updatedAt:new Date().toISOString()};if(!value.name||!value.sql.trim())throw new Error("Название и SQL обязательны");await this.queries.update((items)=>[value,...items.filter((item)=>item.id!==value.id)]);return value;}
  async deleteQuery(id){await this.queries.update((items)=>items.filter((item)=>item.id!==id));return true;}
  async getSettings(){const value=await this.settings.read();return {...value,enabledProviders:Array.from(new Set(["postgresql",...(value.enabledProviders??[]).filter((id)=>KNOWN_PROVIDERS.has(id))]))};}
  async saveSettings(input){const installed=await this.providerInstaller.list();const available=new Set(installed.filter((item)=>item.installed).map((item)=>item.id));const enabledProviders=Array.from(new Set(["postgresql",...(input.enabledProviders??[]).filter((id)=>available.has(id))]));const value={theme:input.theme==="light"?"light":"dark",defaultTimeoutMs:Math.max(1000,Math.min(Number(input.defaultTimeoutMs)||15000,300000)),rowLimit:Math.max(1,Math.min(Number(input.rowLimit)||1000,10000)),enabledProviders};await this.settings.write(value);return value;}
  async listHistory(){return this.history.read();}
  async execute(input){const profile=await this.findConnection(input.connectionId);await this.ensureProviderEnabled(profile.providerId);const settings=await this.getSettings();const startedAt=new Date().toISOString();try{const result=await this.providers[profile.providerId].execute({...input,profile,timeoutMs:input.timeoutMs??settings.defaultTimeoutMs,rowLimit:input.rowLimit??settings.rowLimit});await this.addHistory({id:input.requestId,connectionId:profile.id,connectionName:profile.name,sql:input.sql,startedAt,durationMs:result.durationMs,ok:true,rowCount:result.rowCount});return result}catch(error){await this.addHistory({id:input.requestId,connectionId:profile.id,connectionName:profile.name,sql:input.sql,startedAt,ok:false,error:error.message});throw error}}
  async cancel({requestId,connectionId}){const profile=await this.findConnection(connectionId);return this.providers[profile.providerId].cancel(requestId);}
  async addHistory(entry){await this.history.update((items)=>[entry,...items].slice(0,500));}
}
