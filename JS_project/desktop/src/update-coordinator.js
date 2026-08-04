import { mkdir, open, rename, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { UPDATE_STATES } from "@db-tools/update-contracts";
import { decideUpdate, normalizeSha256, sha256File, verifyManifestSignature } from "@db-tools/update-core";

export class UpdateCoordinator {
  constructor({ client,currentVersion,channel="stable",publicKeyPem,downloadDirectory,logger=null }) { Object.assign(this,{client,currentVersion,channel,publicKeyPem,downloadDirectory,logger}); this.snapshot={state:UPDATE_STATES.IDLE,currentVersion,channel}; }
  setState(state,extra={}) { this.snapshot={...this.snapshot,...extra,state}; return this.snapshot; }
  async check() {
    await this.logger?.info("update.check.started",{currentVersion:this.currentVersion,channel:this.channel});
    this.setState(UPDATE_STATES.CHECKING,{error:null});
    try { if (!this.publicKeyPem) return this.setState(UPDATE_STATES.CONFIG_REQUIRED,{message:"Update signing public key is not configured"}); const value=await this.client.latestRelease(this.channel); if (!value) return this.setState(UPDATE_STATES.UP_TO_DATE); if (!verifyManifestSignature(value.manifest,this.publicKeyPem)) throw new Error("Update manifest signature is invalid"); const decision=decideUpdate({currentVersion:this.currentVersion,manifest:value.manifest,channel:this.channel}); if (!decision.available) return this.setState(UPDATE_STATES.UP_TO_DATE,{reason:decision.reason}); if(!value.assetUrl)throw new Error("Installer asset declared by manifest was not found"); return this.setState(UPDATE_STATES.AVAILABLE,{manifest:value.manifest,assetUrl:value.assetUrl,releaseNotes:value.releaseNotes??""}); }
    catch(error) { await this.logger?.error("update.check.failed",error); return this.setState(error.code==="CONFIG_REQUIRED"?UPDATE_STATES.CONFIG_REQUIRED:UPDATE_STATES.ERROR,{message:error.message}); }
  }
  async download() {
    await this.logger?.info("update.download.started",{version:this.snapshot.manifest?.version});
    if (this.snapshot.state!==UPDATE_STATES.AVAILABLE) throw new Error("No verified update is available"); const {manifest,assetUrl}=this.snapshot; this.setState(UPDATE_STATES.DOWNLOADING); await mkdir(this.downloadDirectory,{recursive:true}); const partial=path.join(this.downloadDirectory,`${manifest.asset.name}.partial`); const destination=path.join(this.downloadDirectory,manifest.asset.name); const response=await this.client.downloadAsset(assetUrl); const file=await open(partial,"w",0o600); try { await pipeline(Readable.fromWeb(response.body),file.createWriteStream()); } finally { await file.close().catch(()=>{}); } const info=await stat(partial); if (info.size!==manifest.asset.size) throw new Error("Downloaded update size does not match manifest"); if (normalizeSha256(await sha256File(partial))!==normalizeSha256(manifest.asset.sha256)) throw new Error("Downloaded update checksum does not match manifest"); await rename(partial,destination); return this.setState(UPDATE_STATES.READY,{installerPath:destination});
  }
}
