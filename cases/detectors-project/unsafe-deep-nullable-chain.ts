interface Middle {
  value: string;
}

interface Outer {
  middle?: Middle;
}

export function readDeep(outer: Outer | undefined): string {
  return outer.middle.value;
}
