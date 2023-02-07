export class AsyncGeneratorStream<T = any> {
    private _stream: T[];
    private _generator: AsyncGenerator;

    constructor(stream: T[]) {
        this._stream = stream;
    }

    static stream<T = any>(arr: T[]) {
        return new AsyncGeneratorStream<T>(arr);
    }

    pipeMap(...funcs: ((elm: any) => any)[]): AsyncGeneratorStream<any> {
        const generator = this._pipe(funcs);
        this._generator = generator;
        return this;
    }

    async *_pipe(funcs: any): AsyncGenerator {
        for (let i = 0; i < this._stream.length; i++) {
            for (let func of funcs) {
                this._stream[i] = await func(this._stream[i]);
            }
            yield await this._stream[i];
        }
    }

    async collect(
        collector: IAsyncGeneratorStreamCollector<any>
    ): Promise<any> {
        if (this._generator) {
            return collector.collect(this._generator);
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
        if (Array.isArray(elm) && (elm as any[]).length > 0) {
            return typeof elm[0].next === "function";
        }

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
