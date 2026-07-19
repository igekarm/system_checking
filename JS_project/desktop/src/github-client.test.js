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

test("downloads manifest through its public browser URL",async()=>{
  const urls=[];
  const release={draft:false,prerelease:false,tag_name:"app-v0.1.6",assets:[{name:"latest-win-x64-stable.json",url:"https://api.github.com/private-style-url",browser_download_url:"https://github.com/public-manifest"}]};
  const client=new GitHubReleaseClient({owner:"igekarm",repo:"system_checking",fetchImpl:async(url)=>{urls.push(url);return urls.length===1?new Response(JSON.stringify([release]),{status:200}):new Response(JSON.stringify({version:"0.1.6"}),{status:200});}});
  const value=await client.latestRelease();
  assert.equal(value.manifest.version,"0.1.6");
  assert.equal(urls[1],"https://github.com/public-manifest");
});

test("selects the highest semantic version regardless of GitHub order",async()=>{
  const release=(version)=>({draft:false,prerelease:false,tag_name:`app-v${version}`,assets:[{name:"latest-win-x64-stable.json",browser_download_url:`https://github.com/manifest-${version}`}]});
  const releases=[release("0.1.9"),release("0.1.8"),release("0.1.10")];
  const client=new GitHubReleaseClient({owner:"igekarm",repo:"system_checking",fetchImpl:async(url)=>url.includes("releases?per_page")?new Response(JSON.stringify(releases),{status:200}):new Response(JSON.stringify({version:"0.1.10"}),{status:200})});
  const value=await client.latestRelease();
  assert.equal(value.release.tag_name,"app-v0.1.10");
  assert.equal(value.manifest.version,"0.1.10");
});
