const API = "https://api.github.com";
export class GitHubReleaseClient {
  constructor({ owner, repo, fetchImpl=fetch, logger=null }) { this.owner=owner; this.repo=repo; this.fetch=fetchImpl; this.logger=logger; }
  headers(accept="application/vnd.github+json") { return { Accept:accept, "X-GitHub-Api-Version":"2026-03-10", "User-Agent":"DB-Tools-Updater" }; }
  async request(url, options={}) { const response=await this.fetch(url,{...options,headers:{...this.headers(options.accept),...options.headers}}); await this.logger?.info("update.github.response",{status:response.status}); if (!response.ok) throw new Error(`GitHub public release request failed (${response.status})`); return response; }
  async latestRelease(channel="stable") {
    const response=await this.request(`${API}/repos/${this.owner}/${this.repo}/releases?per_page=20`); const releases=await response.json();
    const release=releases.find((item)=>!item.draft && item.tag_name?.startsWith("app-v") && (channel==="beta" ? item.prerelease : !item.prerelease));
    if (!release) return null; const manifestAsset=release.assets.find((asset)=>asset.name===`latest-win-x64-${channel}.json`);
    if (!manifestAsset) throw new Error("Release does not contain a signed update manifest");
    const manifestResponse=await this.request(manifestAsset.url,{accept:"application/octet-stream"});
    return { release, manifest:await manifestResponse.json() };
  }
  async downloadAsset(assetUrl) { return this.request(assetUrl,{accept:"application/octet-stream"}); }
}
