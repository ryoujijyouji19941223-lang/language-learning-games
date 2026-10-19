// Blossom is a spring event, not a substitute for all deciduous foliage.
export function treeAppearance(season,species='maple'){
  if(season==='冬')return {kind:'bare',colors:[]};
  if(species==='cherry'&&season==='春')return {kind:'blossom',colors:['#e4cbc6','#dfbfb9','#ead8ce']};
  if(species==='cherry'&&season==='秋')return {kind:'leaf',colors:['#ac4c2c','#ba6c31','#a27d36']};
  if(season==='秋')return {kind:'leaf',colors:['#a64223','#c67b29','#b6993d','#7a8b4a','#8c5029']};
  return {kind:'leaf',colors:['#5a783e','#749049','#849b55','#4e703b']};
}
