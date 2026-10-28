'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('inventoryDesktop',Object.freeze({openConnection:()=>ipcRenderer.invoke('connection:open'),getConnection:()=>ipcRenderer.invoke('connection:get'),testConnection:c=>ipcRenderer.invoke('connection:test',c),saveConnection:c=>ipcRenderer.invoke('connection:save',c),getSavedLogin:()=>ipcRenderer.invoke('credentials:get'),saveLogin:c=>ipcRenderer.invoke('credentials:save',c),clearSavedLogin:()=>ipcRenderer.invoke('credentials:clear')}));
