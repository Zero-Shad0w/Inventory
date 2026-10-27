'use strict';
const path=require('node:path');
function portValue(value,fallback,label){
 const text=value===undefined||value===''?String(fallback):String(value);
 if(!/^\d+$/.test(text))throw Error(`${label} must be a whole number between 1 and 65535`);
 const n=Number(text);
 if(n<1||n>65535)throw Error(`${label} must be between 1 and 65535`);
 return n;
}
const port=portValue(process.env.ISP_SERVER_PORT??process.env.PORT,3000,'Server port');
const frontendPort=portValue(process.env.ISP_FRONTEND_PORT,3001,'Frontend port');
if(port===frontendPort)throw Error('Server and frontend ports must be different');
module.exports={port,frontendPort,dataDir:process.env.ISP_DATA_DIR||path.join(process.cwd(),'data'),portValue};
