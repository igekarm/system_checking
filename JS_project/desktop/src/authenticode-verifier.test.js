import assert from "node:assert/strict";
import test from "node:test";
import { readAuthenticodeSignature } from "./authenticode-verifier.js";

test("passes installer path through environment, not command text",async()=>{
  let captured;
  const signature=await readAuthenticodeSignature("C:\\Path with spaces\\DB Tools.exe",{execFileImpl:async(command,args,options)=>{captured={command,args,options};return {stdout:'{"Status":"Valid","Subject":"CN=DB Tools"}'};}});
  assert.equal(signature.Status,"Valid");
  assert.equal(captured.command,"powershell.exe");
  assert.equal(captured.options.env.DB_TOOLS_INSTALLER_PATH,"C:\\Path with spaces\\DB Tools.exe");
  assert.equal(captured.args.includes("C:\\Path with spaces\\DB Tools.exe"),false);
});

test("returns a clear error for invalid PowerShell output",async()=>{
  await assert.rejects(readAuthenticodeSignature("installer.exe",{execFileImpl:async()=>({stdout:""})}),/некорректный результат/);
});
