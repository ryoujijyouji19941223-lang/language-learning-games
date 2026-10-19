export const vendingDrinks=[
  {id:'coffee',name:'缶コーヒー',temperature:'あたたかい',price:140,container:'can'},
  {id:'tea',name:'麦茶',temperature:'つめたい',price:120,container:'pet'},
];
export const containerNames={can:'空き缶',pet:'空のペットボトル'};
export const freshOutdoors=()=>({drinks:{coffee:0,tea:0},empties:{can:0,pet:0}});
export function validOutdoors(o){
  const counts=(values,keys)=>values&&typeof values==='object'&&!Array.isArray(values)&&Object.keys(values).length===keys.length&&keys.every(k=>Number.isSafeInteger(values[k])&&values[k]>=0&&values[k]<=99999);
  return o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===2&&counts(o.drinks,['coffee','tea'])&&counts(o.empties,['can','pet']);
}
