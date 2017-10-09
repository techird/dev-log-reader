const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
let i = 0;

const pad = (str, count = 3) => {
  str = String(str);
  while (str.length < count) {
    str = '0' + str;
  }
  return str;
}
function print() {
  console.log(`[${new Date().toLocaleTimeString()}.${pad(+new Date() % 1000)}] ${numbers[i++]}`);
  i = i % numbers.length;
  setTimeout(print, 200);
}
print();