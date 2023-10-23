export function includeStringToObjectTransform({ value }: { value: string }) {
  const array = value?.split(',');
  return array.reduce((obj, key) => {
    obj[key] = true;
    return obj;
  }, {});
}
