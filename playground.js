// 1. implement curry()
// function curry(fn) {
//   return function curried(...args) {
//     if (args.length >= fn.length) {
//       return fn.apply(this, args);
//     } else {
//       return function(...args2) {
//         return curried.apply(this,args.concat(args2));
//       }
//     }
//   }
// }

// const range = {
//   from: 1,
//   to: 10,
//   [Symbol.iterator]() {
//     return {
//       current: this.from,
//       last: this.to,
//       next() {
//         if (this.current <= this.last) {
//           return {
//             value: this.current++,
//             done: false,
//           };
//         } else {
//           return {
//             done: true,
//           };
//         }
//       },
//     };
//   },
// };

// const rangeV2 = {
//   from: 1,
//   to: 10,
//   *[Symbol.iterator]() {
//     for (let i = this.from; i <= this.to; i++) {
//       yield i;
//     }
//   },
// };

// function* generateSequence(from, to) {
//   for (let i = from; i <= to; i++) {
//     yield i;
//   }
// }

// function* generateAlphaNum() {
//   yield* generateSequence(1, 10);
//   yield* generateSequence(20, 30);
// }

// const generator = generateAlphaNum();
// for (const i of generator) {
//   console.log(i);
// }

// function* test2Way() {
//   const result = yield "1+1=?";
//   console.log("result", result);
//   const result2 = yield "1+3=?";
//   console.log("result2", result2);
// }

// const generator = test2Way();
// console.log(generator.next());
// generator.next(200);
// console.log(generator.next());
// generator.next(10);

// function* pseudoRandom(num) {
//   let value = num;
//   while (true) {
//     value = (value * 16807) % 2147483647;
//     yield value;
//   }
// }

// let generator = pseudoRandom(1);

// console.log(generator.next().value); // 16807
// console.log(generator.next().value); // 282475249
// console.log(generator.next().value); // 1622650073
// console.log(generator.next().value); // 1622650073

// let timeId = setTimeout(function tick() {
//   console.log("tick");
//   timeId = setTimeout(tick, 2000);
// }, 2000);

function parial(func, ...boundArgs) {
  return function (...args) {
    return func.call(this, [...boundArgs, ...args]);
  };
}
