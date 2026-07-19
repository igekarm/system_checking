import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync=promisify(execFile);
const script=`$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()
$p=$env:DB_TOOLS_INSTALLER_PATH
if([string]::IsNullOrWhiteSpace($p)){throw 'Installer path is missing'}
$s=Get-AuthenticodeSignature -LiteralPath $p
$subject=if($null -ne $s.SignerCertificate){$s.SignerCertificate.Subject}else{''}
[pscustomobject]@{Status=[string]$s.Status;Subject=$subject}|ConvertTo-Json -Compress`;

export async function readAuthenticodeSignature(file,{execFileImpl=execFileAsync}={}){
  if(!file)throw new Error("Installer path is missing");
  let stdout;
  try{
    ({stdout}=await execFileImpl("powershell.exe",["-NoProfile","-NonInteractive","-Command",script],{windowsHide:true,encoding:"utf8",env:{...process.env,DB_TOOLS_INSTALLER_PATH:file}}));
  }catch(error){throw new Error("Не удалось проверить цифровую подпись установщика",{cause:error});}
  try{return JSON.parse(stdout.trim());}
  catch{throw new Error("PowerShell вернул некорректный результат проверки цифровой подписи");}
}
