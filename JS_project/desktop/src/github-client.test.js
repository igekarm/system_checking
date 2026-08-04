import assert from "node:assert/strict";
import test from "node:test";
import { GitHubReleaseClient } from "./github-client.js";

test("public release requests never send GitHub authorization",async()=>{
  let requestOptions;
  const client=new GitHubReleaseClient({owner:"igekarm",repo:"system_checking",fetchImpl:async(_url,options)=>{requestOptions=options;return new Response("{}",{status:200,headers:{"content-type":"application/json"}});}});
  await client.request("https://api.github.com/test");
  assert.equal(requestOptions.headers.Authorization,undefined);
  assert.equal(requestOptions.headers["User-Agent"],"DB-Tools-Updater");
});

test("public release errors do not request user authorization",async()=>{
  const client=new GitHubReleaseClient({owner:"igekarm",repo:"system_checking",fetchImpl:async()=>new Response("not found",{status:404})});
  await assert.rejects(client.request("https://api.github.com/test"),/public release request failed \(404\)/);
});

test("stable updates use permanent release URLs without GitHub API",async()=>{
  const urls=[];
  const manifest={version:"0.2.2",asset:{name:"DB-Tools-0.2.2-win-x64.exe"}};
  const client=new GitHubReleaseClient({owner:"igekarm",repo:"system_checking",fetchImpl:async(url)=>{urls.push(url);return new Response(JSON.stringify(manifest),{status:200});}});
  const value=await client.latestRelease();
  assert.equal(value.manifest.version,"0.2.2");
  assert.equal(urls.length,1);
  assert.equal(urls[0],"https://github.com/igekarm/system_checking/releases/latest/download/latest-win-x64-stable.json");
  assert.equal(value.assetUrl,"https://github.com/igekarm/system_checking/releases/download/app-v0.2.2/DB-Tools-0.2.2-win-x64.exe");
});

test("beta updates retain API release discovery",async()=>{
  const release={draft:false,prerelease:true,tag_name:"app-v0.3.0-beta.1",body:"Beta",assets:[{name:"latest-win-x64-beta.json",browser_download_url:"https://github.com/beta-manifest"},{name:"DB-Tools-beta.exe",browser_download_url:"https://github.com/beta-installer"}]};
  const client=new GitHubReleaseClient({owner:"igekarm",repo:"system_checking",fetchImpl:async(url)=>url.includes("releases?per_page")?new Response(JSON.stringify([release]),{status:200}):new Response(JSON.stringify({version:"0.3.0-beta.1",asset:{name:"DB-Tools-beta.exe"}}),{status:200})});
  const value=await client.latestRelease("beta");
  assert.equal(value.assetUrl,"https://github.com/beta-installer");
  assert.equal(value.releaseNotes,"Beta");
});
