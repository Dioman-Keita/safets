declare const preferred: string | undefined;

const apiKey = preferred ?? process.env.API_KEY;

console.log(apiKey);
