PoC of an alternative way to handle async streams

# Example

```typescript
import {
    AsyncGeneratorStream,
    AsyncGeneratorStreamCollectors,
} from "./AsyncGeneratorStream";

class Data {
    private _index: number;

    constructor(idx: number) {
        this._index = idx;
    }

    async readText(): Promise<any> {
        return fetch("https://dummyjson.com/todos/" + this._index);
    }
}

async function main() {
    const data: Data[] = [];

    for (let i = 1; i < 11; i++) {
        const newData = new Data(i);
        data.push(newData);
    }

    const res = await AsyncGeneratorStream.stream(data)
        .pipeMap(
            (e) => e.readText(),
            (e) => e.json(),
            (e) => e.todo
        )
        .collect(AsyncGeneratorStreamCollectors.toArray());

    console.log(res);
}

main();

` Returns: 
[
  'Do something nice for someone I care about',
  'Memorize the fifty states and their capitals',
  'Watch a classic movie',
  'Contribute code or a monetary donation to an open-source software project',
  "Solve a Rubik's cube",
  'Bake pastries for me and neighbor',
  'Go see a Broadway production',
  'Write a thank you letter to an influential person in my life',
  'Invite some friends over for a game night',
  'Have a football scrimmage with some friends'
]

`;
```
