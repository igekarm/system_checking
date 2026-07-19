import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { safeStorage } from "electron";

export class SecretStore {
  constructor(directory){this.directory=path.join(directory,"secrets");}
  file(id){if(!/^[a-zA-Z0-9-]+$/.test(id))throw new Error("Invalid secret id");return path.join(this.directory,`${id}.bin`);}
  async get(id){try{if(!safeStorage.isEncryptionAvailable())throw new Error("System credential encryption is unavailable");return safeStorage.decryptString(await readFile(this.file(id)));}catch(error){if(error.code==="ENOENT")return null;throw error;}}
  async set(id,value){if(!safeStorage.isEncryptionAvailable())throw new Error("System credential encryption is unavailable");await mkdir(this.directory,{recursive:true});await writeFile(this.file(id),safeStorage.encryptString(value),{mode:0o600});}
  async delete(id){await rm(this.file(id),{force:true});}
}
