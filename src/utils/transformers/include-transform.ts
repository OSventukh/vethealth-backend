export function includeStringToObjectTransform({ value }: { value: string }) {
  if (typeof value === 'object') return value;
  const array = value?.split(',');
  return array.reduce((obj, key) => {
    obj[key] = true;
    return obj;
  }, {});
}
