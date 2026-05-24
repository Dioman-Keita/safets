type User = { name: string } | undefined;

const user: User = undefined;
const { name } = user;
console.log(name);
