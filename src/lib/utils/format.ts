/* Formatting helpers — compact, tabular, analyst-friendly. */
export function formatCurrency(value:number,currency="units",opts?:{compact?:boolean;signed?:boolean}):string{
 const abs=Math.abs(value); const sign=opts?.signed&&value<0?"-":value<0?"-": "";
 if(currency==="MULTI")return "Multiple currencies";
 if(currency==="units"||!currency){
  let numberLabel=new Intl.NumberFormat("en-US",{maximumFractionDigits:abs<10?2:0}).format(abs);
  if(opts?.compact&&abs>=1_000){numberLabel=abs>=1_000_000?`${(abs/1_000_000).toFixed(abs>=10_000_000?0:1)}M`:`${(abs/1_000).toFixed(abs>=100_000?0:1)}K`;}
  return `${sign}${numberLabel} units`;
 }
 if(opts?.compact&&abs>=1_000){
  const compact=abs>=1_000_000?`${(abs/1_000_000).toFixed(abs>=10_000_000?0:1)}M`:`${(abs/1_000).toFixed(abs>=100_000?0:1)}K`;
  return `${sign}${compact} ${currency}`;
 }
 try{return `${sign}${new Intl.NumberFormat("en-US",{style:"currency",currency,minimumFractionDigits:0,maximumFractionDigits:abs<10?2:0}).format(abs)}`;}
 catch{return `${sign}${new Intl.NumberFormat("en-US").format(abs)} ${currency}`;}
}
export function formatNumber(value:number):string{return new Intl.NumberFormat("en-US").format(value)}
export function formatPercent(value:number):string{return `${Math.round(value)}%`}
export function formatDateTime(value:string):string{
 if(!value)return "Time unavailable";
 const relative=/^step:(\d+)$/i.exec(value);
 if(relative)return `Step ${Number(relative[1])}`;
 const d=new Date(value); if(Number.isNaN(d.getTime()))return "Time unavailable";
 return d.toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});
}
export function formatDate(value:string):string{
 if(!value||/^step:/i.test(value))return formatDateTime(value);
 const d=new Date(value); if(Number.isNaN(d.getTime()))return "Date unavailable";
 return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
export function timeAgo(value:string,now=Date.now()):string{
 if(!value||/^step:/i.test(value))return formatDateTime(value);
 const stamp=new Date(value).getTime(); if(Number.isNaN(stamp))return "Time unavailable";
 const diff=Math.max(0,now-stamp),mins=Math.floor(diff/60_000);
 if(mins<1)return "just now"; if(mins<60)return `${mins}m ago`;
 const hours=Math.floor(mins/60); if(hours<24)return `${hours}h ago`;
 const days=Math.floor(hours/24); if(days<7)return `${days}d ago`;
 return formatDate(value);
}
export function truncateMiddle(value:string,head=10,tail=8):string{if(value.length<=head+tail+1)return value;return `${value.slice(0,head)}…${value.slice(-tail)}`}
export function formatCompactCurrencyLabel(value:number,currency="units"):string{return currency==="MULTI"?"Multiple currencies":formatCurrency(value,currency,{compact:true})}
