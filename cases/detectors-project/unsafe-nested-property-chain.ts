interface Outer {
  middle?: { value: string };
}

const outer: Outer = {};

console.log(outer.middle.value);
