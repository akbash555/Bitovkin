import data from '../configurator.json';

export const options = data;
export type Config = {
  length: number;
  width: number;
  height: number;
  color: keyof typeof data.colors;
  finish: keyof typeof data.finishes;
  windows: keyof typeof data.windows;
  door: keyof typeof data.doors;
  roof: keyof typeof data.roofs;
};
export type Model = {id: string; name: string; tile?: number};
export const dimensions = {
  length: {label:'Длина', min:3, max:12, step:0.2},
  width: {label:'Ширина', min:2, max:5, step:0.2},
  height: {label:'Высота этажа', min:2.2, max:3.4, step:0.2}
} as const;
export const choices = {color:data.colors,finish:data.finishes,windows:data.windows,door:data.doors,roof:data.roofs};

export function defaults(id: string): Config {
  const presets = data.presets as Record<string, Partial<Config>>;
  return { ...data.default as Config, ...(Object.hasOwn(presets,id) ? presets[id] : {}) };
}

export function restore(id: string, encoded: string | null): Config {
  const state = defaults(id);
  if (!encoded) return state;
  try {
    const input = JSON.parse(encoded);
    for (const key of Object.keys(dimensions) as (keyof typeof dimensions)[]) {
      const value = input[key];
      const {min,max} = dimensions[key];
      if (typeof value === 'number' && value >= min && value <= max) state[key] = value;
    }
    for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
      const value = input[key];
      if (typeof value === 'string' && Object.hasOwn(choices[key],value)) Object.assign(state,{[key]:value});
    }
  } catch {}
  return state;
}

export const meters = (value: number) => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value);
export function summary(model: Model, config: Config) {
  return [
    model.name,
    `${meters(config.length)} × ${meters(config.width)} × ${meters(config.height)} м${model.id==='multilevel'?' (на этаж)':''}`,
    `Обшивка — ${data.finishes[config.finish]}, цвет — ${data.colors[config.color][0]}`,
    `Окна — ${data.windows[config.windows]}, дверь — ${data.doors[config.door].toLowerCase()}, крыша — ${data.roofs[config.roof].toLowerCase()}`
  ].join('\n');
}
