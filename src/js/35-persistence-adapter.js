'use strict';
const ACTIVA_SERVER_CONFIG=Object.freeze({enabled:false,baseUrl:'',authMode:'studio-permit',schema:'activa-server-config-v1'});
const ACTIVA_PERSISTENCE={
  schema:'activa-persistence-adapter-v1',mode:'local',server:ACTIVA_SERVER_CONFIG,
  async health(){return{ok:true,mode:this.mode,serverEnabled:false,projectStore:!!localStore,libraryStore:'indexeddb-with-local-fallback'}},
  project:{read:()=>safeGet(localStore,PROJECT_KEY),write:(value)=>activaPersistenceAllowed()&&safeSet(localStore,PROJECT_KEY,value),remove:()=>safeRemove(localStore,PROJECT_KEY)},
  library:{all:()=>libraryDbAll(),put:(entry)=>libraryDbPut(entry),delete:(id)=>libraryDbDelete(id)},
  async connectServer(config){if(!config?.enabled)throw new Error('Serverový režim není aktivován.');throw new Error('Serverový konektor je připraven jako rozhraní, ale v bezserverovém vydání není implementován.')}
};
window.ACTIVA_PERSISTENCE=Object.freeze(ACTIVA_PERSISTENCE);
