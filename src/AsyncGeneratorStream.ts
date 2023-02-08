export class AsyncGeneratorStream<T = any> {
    private _stream: T[];
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

    _createAndSetGenerator() {
        this._generator = this._createGeneratorFromStream();
    }

    async *_createGeneratorFromStream() {
        for (let elm of this._stream) {
            yield elm;
        }
    }

    map(func: (elm: T) => any): AsyncGeneratorStream<any> {
        this._transformations.push(func);
        if (!this._generator) {
            this._createAndSetGenerator();
        }

        return this;
    }

    filter<T = any>(predicate: (elm: T) => any): AsyncGeneratorStream<any> {
        const filterFunc = (elm: T) => {
            if (predicate(elm)) {
                return elm;
            }

            return null;
        };

        if (!this._generator) {
            this._createAndSetGenerator();
        }

        this._transformations.push(filterFunc);
        return this;
    }

    async collect(collector: IAsyncGeneratorCollector<any>): Promise<any> {
        if (!this._generator) {
            this._createAndSetGenerator();
        }

        return collector.collect(this._generator, this._transformations);
    }
}

export interface IAsyncGeneratorCollector<TCollection> {
    collect(
        stream: AsyncGenerator,
        transformations: ((elm: any) => any)[]
    ): Promise<TCollection>;
}

export class ArrayAsyncGeneratorCollector
    implements IAsyncGeneratorCollector<any[]>
{
    async collect<TElement>(
        generator: AsyncGenerator,
        transformations: ((elm: any) => any)[] = []
    ): Promise<TElement[]> {
        if (!this._isGenerator(generator)) {
            throw new Error("Cannot collect non-AsyncGenerator");
        }

        return this._collectAsyncGenerator<TElement>(
            generator,
            transformations
        );
    }

    private async _collectAsyncGenerator<T>(
        generator: AsyncGenerator,
        transformations: ((elm: any) => any)[]
    ) {
        const res = [];

        let iterator = await generator.next();
        while (!iterator.done) {
            let val = iterator.value as T;
            for (let t of transformations) {
                val = await t(val);
            }

            if (val != null && val != undefined) {
                res.push(val);
            }

            iterator = await generator.next();
        }

        return res;
    }

    private _isGenerator(elm: any): boolean {
        return typeof elm.next === "function";
    }
}

export class AsyncGeneratorCollectors {
    static toArray(): ArrayAsyncGeneratorCollector {
        return new ArrayAsyncGeneratorCollector();
    }
}
