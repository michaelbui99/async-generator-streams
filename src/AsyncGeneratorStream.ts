export class AsyncGeneratorStream<T = any> {
    private _stream: T[];
    private _currentGenerator?: AsyncGenerator;

    constructor(stream: T[]) {
        this._stream = stream;
    }

    static stream<T = any>(arr: T[]) {
        return new AsyncGeneratorStream<T>(arr);
    }

    map(func: (elm: T) => any): AsyncGeneratorStream {
        const generator = this._map(func);
        this._currentGenerator = generator;
        return this;
    }

    async *_map(func: (elm: T) => any) {
        for (const e of this._stream) {
            yield await func(e);
        }
    }

    collect(collector: IAsyncGeneratorStreamCollector<any>): Promise<any> {
        if (this._currentGenerator) {
            return collector.collect(this._currentGenerator);
        }

        return collector.collect(this);
    }

    async *_getValue() {
        yield this._stream;
    }
}

export interface IAsyncGeneratorStreamCollector<TCollection> {
    collect<TElement>(
        stream: AsyncGeneratorStream<TElement> | AsyncGenerator
    ): Promise<TCollection>;
}

export class ArrayAsyncGeneratorStreamCollector
    implements IAsyncGeneratorStreamCollector<any[]>
{
    async collect<TElement>(
        stream:
            | AsyncGenerator<unknown, any, unknown>
            | AsyncGeneratorStream<TElement>
    ): Promise<TElement[]> {
        if (stream instanceof AsyncGeneratorStream) {
            return await this._collectAsyncGeneratorStream(stream);
        }

        if (this._isGenerator(stream)) {
            return this._collectAsyncGenerator<TElement>(stream);
        }

        throw new Error("Failed to collect");
    }

    private async _collectAsyncGenerator<T>(generator: AsyncGenerator) {
        const res = [];

        let iterator = await generator.next();
        while (!iterator.done) {
            res.push(iterator.value as T);
            iterator = await generator.next();
        }

        return res;
    }

    private _isGenerator(elm: any): boolean {
        return typeof elm.next === "function";
    }

    private async _collectAsyncGeneratorStream<T>(
        stream: AsyncGeneratorStream
    ) {
        return (await stream._getValue().next()).value as T;
    }
}

export class AsyncGeneratorStreamCollectors {
    static toArray(): ArrayAsyncGeneratorStreamCollector {
        return new ArrayAsyncGeneratorStreamCollector();
    }
}
