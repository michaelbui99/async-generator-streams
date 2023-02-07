import {
    AsyncGeneratorStream,
    AsyncGeneratorStreamCollectors,
} from "./AsyncGeneratorStream";

class Data {
    private _index: number;

    constructor(idx: number) {
        this._index = idx;
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
        .pipeMap(
            (d) => d.fetchTodo(),
            (res) => res.json(),
            (todoObj) => todoObj.todo
        )
        .collect(AsyncGeneratorStreamCollectors.toArray());

    console.log(res);
}

main();
