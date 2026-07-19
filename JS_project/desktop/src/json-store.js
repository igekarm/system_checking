import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export class JsonStore {
  constructor(directory,name,initialValue){this.directory=directory;this.filePath=path.join(directory,`${name}.json`);this.initialValue=initialValue;this.queue=Promise.resolve();}
  async read(){try{return JSON.parse(await readFile(this.filePath,"utf8"));}catch(error){if(error.code==="ENOENT")return structuredClone(this.initialValue);throw error;}}
  async writeNow(value){await mkdir(this.directory,{recursive:true});const temporary=`${this.filePath}.${process.pid}.tmp`;await writeFile(temporary,JSON.stringify(value,null,2)+"\n",{mode:0o600});await rename(temporary,this.filePath);}
  async write(value){this.queue=this.queue.then(()=>this.writeNow(value));return this.queue;}
  async update(mutator){let output;this.queue=this.queue.then(async()=>{const value=await this.read();output=(await mutator(value))??value;await this.writeNow(output);});await this.queue;return output;}
}
