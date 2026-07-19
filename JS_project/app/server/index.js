import { startAppServer } from "@db-tools/app-server";
startAppServer().then(()=>console.log("API listening on http://127.0.0.1:3001 (mock transport)")).catch((error)=>{console.error(error);process.exitCode=1;});
