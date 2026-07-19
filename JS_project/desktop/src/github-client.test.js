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
