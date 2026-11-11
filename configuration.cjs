const options=require('./configurator.json');
const bounds={length:[3,12],width:[2,5],height:[2.2,3.4]};
const choices={color:options.colors,finish:options.finishes,windows:options.windows,door:options.doors,roof:options.roofs};
const meters=value=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value);

function describeConfiguration(encoded,model) {
  if (!encoded || !model) return '';
  let config;
  try {config=JSON.parse(encoded);} catch {return '';}
  if (!config || typeof config!=='object') return '';
  for (const [key,[min,max]] of Object.entries(bounds)) {
    const value=config[key];
    if (typeof value!=='number' || !Number.isFinite(value) || value<min || value>max) return '';
  }
  for (const [key,values] of Object.entries(choices)) {
    if (typeof config[key]!=='string' || !Object.hasOwn(values,config[key])) return '';
  }
  return [
    'Конфигурация 3D',
    `Базовая модель — ${model.name}`,
    `Размеры — ${meters(config.length)} × ${meters(config.width)} × ${meters(config.height)} м${model.id==='multilevel'?' (на этаж)':''}`,
    `Обшивка — ${options.finishes[config.finish]}`,
    `Цвет — ${options.colors[config.color][0]}`,
    `Окна — ${options.windows[config.windows]}`,
    `Дверь — ${options.doors[config.door]}`,
    `Крыша — ${options.roofs[config.roof]}`
  ].join('\n');
}

module.exports={describeConfiguration};
