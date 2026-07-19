import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { x as extractTar } from "tar";

const require=createRequire(import.meta.url);
export const ORACLE_PROVIDER=Object.freeze({
  id:"oracle",name:"Oracle Database",version:"7.0.1",mode:"Thin",minimumDatabaseVersion:"12.1",
  source:"https://registry.npmjs.org/oracledb/-/oracledb-7.0.1.tgz",
  sourceLabel:"официальный npm Registry · пакет Oracle node-oracledb",
  integrity:"sha512-xlM0Ceh6A5stQLAdEfKf3pgCSkbOjQLo2ZPEi3+kXklz+KbZD3fLi/nsTSbQeZZNFBSFDNxdn1Ek3+bxG40M8w==",
  unpackedSize:3890029
});

export function verifyIntegrity(buffer,integrity=ORACLE_PROVIDER.integrity){const [algorithm,expected]=integrity.split("-");if(algorithm!=="sha512"||!expected)throw new Error("Некорректная политика проверки Oracle provider");const actual=createHash("sha512").update(buffer).digest("base64");if(actual!==expected)throw new Error("Контрольная сумма Oracle provider не совпадает");return true;}

export class ProviderInstaller {
  constructor(userDataPath,{logger,fetchImpl=globalThis.fetch}={}){this.root=path.join(userDataPath,"providers");this.logger=logger;this.fetchImpl=fetchImpl;this.installing=null;this.driver=null;}
  oracleDirectory(){return path.join(this.root,`oracle-${ORACLE_PROVIDER.version}`);}
  async isOracleInstalled(){try{const value=JSON.parse(await readFile(path.join(this.oracleDirectory(),"package","package.json"),"utf8"));return value.name==="oracledb"&&value.version===ORACLE_PROVIDER.version}catch{return false}}
  async list(){return [{id:"postgresql",name:"PostgreSQL",version:"8.16.3",installed:true,bundled:true},{...ORACLE_PROVIDER,installed:await this.isOracleInstalled(),bundled:false}];}
  async install(providerId){if(providerId!=="oracle")throw new Error("Неизвестный дополнительный provider");if(await this.isOracleInstalled())return (await this.list()).find((item)=>item.id==="oracle");if(!this.installing)this.installing=this.installOracle().finally(()=>{this.installing=null});return this.installing;}
  async installOracle(){const installId=randomUUID();const archive=path.join(this.root,`.oracle-${installId}.tgz`);const staging=path.join(this.root,`.oracle-${installId}`);await mkdir(this.root,{recursive:true});await this.logger?.info("provider.install.started",{providerId:"oracle",version:ORACLE_PROVIDER.version,source:"registry.npmjs.org"});try{const response=await this.fetchImpl(ORACLE_PROVIDER.source,{headers:{Accept:"application/octet-stream"}});if(!response.ok)throw new Error(`Официальный ресурс Oracle provider вернул HTTP ${response.status}`);const buffer=Buffer.from(await response.arrayBuffer());verifyIntegrity(buffer);await writeFile(archive,buffer,{flag:"wx"});await mkdir(staging,{recursive:true});await extractTar({file:archive,cwd:staging,strict:true,preservePaths:false});const packageInfo=JSON.parse(await readFile(path.join(staging,"package","package.json"),"utf8"));if(packageInfo.name!=="oracledb"||packageInfo.version!==ORACLE_PROVIDER.version)throw new Error("Загружен неожиданный пакет Oracle provider");await rename(staging,this.oracleDirectory());await this.logger?.info("provider.install.completed",{providerId:"oracle",version:ORACLE_PROVIDER.version});return (await this.list()).find((item)=>item.id==="oracle");}catch(error){await this.logger?.error("provider.install.failed",error,{providerId:"oracle",version:ORACLE_PROVIDER.version});throw error}finally{await rm(archive,{force:true}).catch(()=>{});await rm(staging,{recursive:true,force:true}).catch(()=>{})}}
  async loadOracleDriver(){if(this.driver)return this.driver;if(!await this.isOracleInstalled())throw new Error("Oracle provider не установлен. Включите Oracle в настройках приложения");this.driver=require(path.join(this.oracleDirectory(),"package"));return this.driver;}
}
