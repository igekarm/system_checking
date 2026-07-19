import { generateKeyPairSync } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const directory=new URL("../.local-keys/",import.meta.url);await mkdir(directory,{recursive:true});
const {privateKey,publicKey}=generateKeyPairSync("ed25519");const privatePem=privateKey.export({type:"pkcs8",format:"pem"});const publicPem=publicKey.export({type:"spki",format:"pem"});
await writeFile(new URL("update-private.pem",directory),privatePem,{mode:0o600});await writeFile(new URL("update-public.pem",directory),publicPem,{mode:0o644});await writeFile(new URL("UPDATE_SIGNING_PRIVATE_KEY_BASE64.txt",directory),Buffer.from(privatePem).toString("base64"),{mode:0o600});
console.log("Update signing keys generated in .local-keys (never commit this directory)");
