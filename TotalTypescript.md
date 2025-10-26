# Typescript

### Derive a union type from an object

```typescript
export const fruitCount = {
  apple: 1,
  pear: 4,
  banana: 26,
};
type FruitCounts = typeof fruitCount;
type NewSingleFruitCount = {
  [K in keyof FruitCounts]: {
    [K2 in K]: number;
  };
}[keyof FruitCounts];
```

### Use 'in' operator to transform a union to another union

```typescript
export type Entity =
  | {
      type: "user";
    }
  | {
      type: "post";
    }
  | {
      type: "comment";
    };

export type EntityWithId = {
  [EntityType in Entity["type"]]: {
    type: EntityType;
  } & Record<`${EntityType}Id`, string>;
}[Entity["type"]];
```

### Decode URL search params at the type level with ts-toolbelt

```typescript

```

### Use function overloads and generics to type a compose function

```typescript
export function compose<Input, FirstArg, SecondArg, ThirdArg>(
  func: (input: Input) => FirstArg,
  func2: (input: FirstArg) => SecondArg,
  func3: (input: SecondArg) => ThirdArg
): (input: Input) => ThirdArg;
```

### Use 'extends' keyword to narrow the value of a generic

```typescript
export const getDeepValue = <
  Obj,
  FirstKey extends keyof Obj,
  SecondKey extends keyof Obj[FirstKey]
>(
  obj: Obj,
  firstKey: FirstKey,
  secondKey: SecondKey
): Obj[FirstKey][SecondKey] => {
  return {} as any;
};
```

### Write your own 'PropsFrom' helper to extract props from any React component

```typescript
type PropsFrom<TComponent> = TComponent extends React.FC<infer Props>
  ? Props
  : TComponent extends React.Component<infer Props>
  ? Props
  : never;
```

### Create your own 'objectKeys' function using generics and the 'keyof' operator

```typescript
const objectKeys = <Obj extends object>(obj: Obj): (keyof Obj)[] => {
  return Object.keys(obj) as (keyof Obj)[];
};

export const myObject = {
  a: 1,
  b: 2,
  c: 3,
};

objectKeys(myObject).forEach((key) => {
  console.log(myObject[key]);
});
```

### Use generics in React to make dynamic and flexible components

```typescript
interface TableProps<TItem> {
  items: TItem[];
  renderItem: (item: TItem) => React.ReactNode;
}

export function Table<TItem>(props: TableProps<TItem>) {
  return null;
}
```

### Create a 'key remover' function which can process any generic object

```typescript
export const makeKeyRemover =
  <Key extends string>(keys: Key[]) =>
  <Obj>(obj: Obj): Omit<Obj, Key> => {
    return {} as any;
  };
```

### Throw detailed error messages for type checks

```typescript
export const deepEqualCompare = <Arg>(
  a: CheckForBadArgs<Arg>,
  b: CheckForBadArgs<Arg>
): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    throw new Error("You cannot compare two arrays using deepEqualCompare");
  }
};
```

### Use deep partials to help with mocking an entity

```typescript
type DeepPartial<Thing> = Thing extends Function
  ? Thing
  : Thing extends Array<infer InferredArrayMember>
  ? DeepPartialArray<InferredArrayMember>
  : Thing extends object
  ? DeepPartialObject<Thing>
  : Thing | undefined;

interface DeepPartialArray<Thing> extends Array<DeepPartial<Thing>> {}

type DeepPartialObject<Thing> = {
  [Key in keyof Thing]?: DeepPartial<Thing[Key]>;
};
```

### Create autocomplete helper which allows for arbitrary values

```typescript
type LooseAutocomplete<T extends string> = T | Omit<string, T>;
type IconSize = LooseAutocomplete<"sm" | "xs">;
```

### Turn a module into a type

```typescript
export const ADD_TODO = "ADD_TODO";
export const REMOVE_TODO = "REMOVE_TODO";
export const EDIT_TODO = "EDIT_TODO";

export type ActionModule = typeof import("./constants");
export type Action = ActionModule[keyof ActionModule];
```

### Use 'declare global' to allow types to cross module boundaries

```typescript
declare global {
  interface GlobalReducerEvent {
    LOG_IN: {};
  }
}

export type GlobalReducer<TState> = (
  state: TState,
  event: {
    [EventType in keyof GlobalReducerEvent]: {
      type: EventType;
    } & GlobalReducerEvent[EventType];
  }[keyof GlobalReducerEvent]
) => TState;
```

### Use generics to dynamically specify the number, and type, of arguments to functions

```typescript
const sendEvent = <Type extends Event["type"]>(
  ...args: Extract<Event, { type: Type }> extends { payload: infer TPayload }
    ? [type: Type, payload: TPayload]
    : [type: Type]
) => {};
```

### Make accessing objects safer by enabling 'noUncheckedIndexedAccess' in tsconfig

```typescript

```

### Map over a union type

```typescript
export type Letters = "a" | "b" | "c";
type RemoveC<TType> = TType extends "c" ? never : TType;
```

### Know when to use generics

```typescript
export const getDisplayName = <TItem extends Animal | Human>(
  item: Animal | Human
): TItem extends Human ? { humanName: string } : { animal: string } => {
  if ("name" in item) {
    return {
      animalName: item.name,
    };
  }
};
```

### Assign local variables to default generic slots to dry up your code and improve performance

```typescript
export type Obj = {
  a: "a";
  a2: "a2";
  a3: "a3";
  b: "b";
  b1: "b1";
  b2: "b2";
};

type ValuesOfKeysStartingWithA<Obj> = {
  [K in Extract<keyof Obj, `a${string}`>]: Obj[K];
}[Extract<keyof Obj, `a${string}`>];

type NewUnion = ValuesOfKeysStartingWithA<Obj>;

type ValuesOfKeysStartingWithA<
  Obj,
  _ExtractedKeys extends keyof Obj = Extract<keyof Obj, `a${string}`>
> = {
  [K in _ExtractedKeys]: Obj[k];
}[_ExtractedKeys];
```

### Use assertion functions inside classes

```typescript
export class SDK {
  constructor(public loggedInUserId?: string) {}

  createPost(title: string) {
    this.assertUserIsLoggedIn();

    createPost(this.loggedInUserId, title);
    this.wow;
  }

  assertUserIsLoggedIn(): asserts this is this & {
    loggedInUserId: string;
    wow: boolean;
  } {
    if (this.loggedInUserId) {
      throw new Error("User is not logged in");
    }
  }
}
```

### Get a TypeScript package ready for release to NPM in under 2 minutes

```typescript

```

### Understand how TypeScript infers literal types

```typescript
const moreTsPeople = {
  Andarist: "Andarist",
  Titian: "Titian",
  Devansh: "Devansh",
  Anurag: "Anurag",
} as const;

const tsPeople = ["Andarist", "Titian", "Devansh", "Anurag"] as const;
```

### Ensure that all call sites must be given value

```typescript

```

### Access deeper parts of objects and arrays

```typescript
type PrimaryColor = ColorVariants["primary"]
type NonPrimaryColor = ColorVariants["secondary" | "tertiary"]
type EveryColor = ColorVariants[keyof ColorVariants]
type Letters = ["a", "b", "c"]:
type AOrB = Letters[0 | 1];
type Letter = Letters[number];
interface UserRoleConfig {
  user: ["view", "create", "update"]
  superAdmin: ["view", "create", "update", "delete"]
}
type Role = UserRoleConfig[keyof UserRoleConfig][number]
```

### Use infer in combination with string literals to manipulate keys of objects

```typescript
interface ApiData {
  "maps:longitude": string;
  "maps:latitude": string;
}
type RemoveMaps<T> = T extends `maps:${infer U}` ? U : T;
```

### Compare function overloads and generics

```typescript
export function returnwWhatIPassIn<TInput>(input: TInput): TInput {
  return input;
}
```

###

```typescript

```

### Type Predicates

```typescript
const isString = (input: unknown): input is string => {
  return typeof input === "string";
};
const mixedArray = [1, "hello", []];
const stringOnly = mixedArray.filter(isString);
```
