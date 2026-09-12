export function canonicalStringify(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj === 'number') {
    // preserve JS number formatting, 0 and -0 are 0, etc.
    if (Object.is(obj, -0)) return '0';
    return String(obj);
  }
  if (typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'string') return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    const arrStr = obj.map(item => canonicalStringify(item)).join(',');
    return `[${arrStr}]`;
  }

  if (typeof obj === 'object') {
    // Handle Firestore Timestamps (duck typing)
    if (typeof obj.toDate === 'function' && typeof obj.seconds === 'number') {
      return JSON.stringify(obj.toDate().toISOString());
    }
    // Handle JS Dates
    if (obj instanceof Date) {
      return JSON.stringify(obj.toISOString());
    }

    const keys = Object.keys(obj).sort();
    const props = keys.map(key => {
      const val = obj[key];
      if (val === undefined) return ''; // ignore undefined just like JSON.stringify
      return `${JSON.stringify(key)}:${canonicalStringify(val)}`;
    }).filter(s => s !== '');
    return `{${props.join(',')}}`;
  }

  return '';
}
