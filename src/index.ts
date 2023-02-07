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

    for (let i = 0; i < 10; i++) {
        const newData = new Data(i);
        data.push(newData);
    }

    const res = await AsyncGeneratorStream.stream(data)
        .map(async (d) => (await d.readText()).json())
        .collect(AsyncGeneratorStreamCollectors.toArray());

    console.log(res);
}

main();
