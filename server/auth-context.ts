import { AsyncLocalStorage } from 'node:async_hooks';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export const requestIdentity=new AsyncLocalStorage<ChatGPTUser|null>();
export async function getChatGPTUser(){return requestIdentity.getStore()??null;}
