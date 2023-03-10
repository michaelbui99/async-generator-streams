PoC of an alternative way to handle async streams using AsyncGenerators

# Example

```typescript
import {
    AsyncGeneratorStream,
    AsyncGeneratorCollectors,
} from "./AsyncGeneratorStream";

class Data {
    private _index: number;

    constructor(idx: number) {
        this._index = idx;
    }

    get index() {
        return this._index;
    }
    async fetchTodo(): Promise<any> {
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
        .map((d) => d.fetchTodo())
        .map((res) => res.json())
        .map((todo) => todo.todo)
        .filter<string>((text) => text.toLowerCase().includes("open-source"))
        .collect(AsyncGeneratorCollectors.toArray())
        .catch((e) => console.error("Something went wrong", e));

    console.log(res); //prints ['Contribute code or a monetary donation to an open-source software project']

    const resReduce = await AsyncGeneratorStream.stream(data)
        .map((d) => d.fetchTodo())
        .map((res) => res.json())
        .map((todo) => todo.todo)
        .filter<string>((text) => text.toLowerCase().includes("open-source"))
        .map((s) => s.split(" "))
        .collect(
            AsyncGeneratorCollectors.withReducer(
                (accumulator, currentvalue, _) => accumulator + currentvalue
            )
        )
        .catch((e) => console.error("Something went wrong", e));

    console.log(resReduce); //prints 'Contributecodeoramonetarydonationtoanopen-sourcesoftwareproject'
}

main();
```
