import type { ApiErrorResponse } from "@shared/types";
export class ApiError extends Error { statusCode:number; constructor(statusCode:number,message:string){super(message);this.statusCode=statusCode;this.name="ApiError";} }
// Same-origin server proxy; backend credentials are never bundled into the browser.
export const API_BASE_URL=process.env.NEXT_PUBLIC_API_URL??"/backend";
export const API_MODE:"live"|"mock"="live";
export async function request<T>(path:string,init?:RequestInit&{json?:unknown}):Promise<T>{
 const {json,...rest}=init??{}; let response:Response;
 try{response=await fetch(`${API_BASE_URL}${path}`,{...rest,headers:{...(json!==undefined?{"Content-Type":"application/json"}:{}),...(rest.headers??{})},body:json!==undefined?JSON.stringify(json):rest.body,cache:"no-store"});}
 catch{throw new ApiError(0,"Cannot reach the MuleTrace API. Start the backend and retry.");}
 if(!response.ok){let message=`Request failed with status ${response.status}`;try{const body=await response.json() as ApiErrorResponse;if(body?.message)message=body.message;}catch{/* fallback */}throw new ApiError(response.status,message);}
 return await response.json() as T;
}
