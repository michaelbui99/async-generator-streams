export class AsyncGeneratorStream<T = any> {
    private _stream: T[] = [];
    private _generator: AsyncGenerator;
    private _transformations: ((elm: any) => any)[] = [];

    constructor(
        stream: T[],
        generator: AsyncGenerator | undefined | null = undefined
    ) {
        this._stream = stream;
        if (generator) {
            this._generator = generator;
        }
    }

    static stream<T = any>(bind: T[] | AsyncGenerator) {
        if (Array.isArray(bind)) {
            return new AsyncGeneratorStream<T>(bind);
        }

        if (typeof bind.next === "function") {
            return new AsyncGeneratorStream<T>([], bind);
        }

        throw new Error("Failed to stream");
    }

    async *_generateStream() {
        if (this._generator) {
            return;
        }

        for (let elm of this._stream) {
            yield await elm;
        }
    }

    map(func: (elm: T) => any): AsyncGeneratorStream<any> {
        this._transformations.push(func);
        if (!this._generator) {
            this._generateStream();
        }

        return this;
    }

    pipeMap(...funcs: ((elm: any) => any)[]): AsyncGeneratorStream<any> {
        const generator = this._pipe(funcs);
        this._generator = generator;
        return this;
    }

    async *_pipe(funcs: any): AsyncGenerator {
        if (this._stream.length === 0) {
            return;
        }

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
            return collector.collect(this._generator, this._transformations);
        }

        return collector.collect(this, this._transformations);
    }
}

export interface IAsyncGeneratorStreamCollector<TCollection> {
    collect<TElement>(
        stream: AsyncGeneratorStream<TElement> | AsyncGenerator,
        transformations: ((elm: any) => any)[]
    ): Promise<TCollection>;
}

export class ArrayAsyncGeneratorStreamCollector
    implements IAsyncGeneratorStreamCollector<any[]>
{
    async collect<TElement>(
        stream: AsyncGenerator | AsyncGeneratorStream<TElement>,
        transformations: ((elm: any) => any)[] = []
    ): Promise<TElement[]> {
        if (stream instanceof AsyncGeneratorStream) {
            stream._generateStream();
        }

        if (this._isGenerator(stream)) {
            return this._collectAsyncGenerator<TElement>(
                stream as AsyncGenerator,
                transformations
            );
        }

        throw new Error("Failed to collect");
    }

    private async _collectAsyncGenerator<T>(
        generator: AsyncGenerator,
        transformations: ((elm: any) => any)[]
    ) {
        const res = [];

        let iterator = await generator.next();
        while (!iterator.done) {
            let val = iterator.value as T;
            transformations.forEach((transformation) => {
                val = transformation(val);
            });
            res.push(val);
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
}

export class AsyncGeneratorStreamCollectors {
    static toArray(): ArrayAsyncGeneratorStreamCollector {
        return new ArrayAsyncGeneratorStreamCollector();
    }
}
