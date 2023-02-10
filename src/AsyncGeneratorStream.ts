export class AsyncGeneratorStream<T = any> {
    private _stream: T[];
    private _generator: AsyncGenerator;
    private _transformations: ((elm: any, index: number) => any)[] = [];

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

    map(
        func: (elm: T, index: number, array: any[]) => any
    ): AsyncGeneratorStream<any> {
        const array = this._stream ? this._stream : [];
        this._transformations.push((e: T, idx: number) => func(e, idx, array));

        if (!this._generator) {
            this._createAndSetGenerator();
        }

        return this;
    }

    filter<T = any>(
        predicate: (elm: T, index: number, array: any[]) => any
    ): AsyncGeneratorStream<any> {
        const array = this._stream ? this._stream : [];

        const filterFunc = (elm: T, idx: number) => {
            if (predicate(elm, idx, array)) {
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

    private _createAndSetGenerator() {
        this._generator = this._createGeneratorFromStream();
    }

    private async *_createGeneratorFromStream() {
        for (let elm of this._stream) {
            yield elm;
        }
    }
}

export interface IAsyncGeneratorCollector<TCollection> {
    collect(
        generator: AsyncGenerator,
        transformations: ((elm: any, index: number) => any)[]
    ): Promise<TCollection>;
}

export class ArrayAsyncGeneratorCollector
    implements IAsyncGeneratorCollector<any[]>
{
    async collect<TElement>(
        generator: AsyncGenerator,
        transformations: ((elm: any, index: number) => any)[] = []
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
        transformations: ((elm: any, index: number) => any)[]
    ) {
        const res = [];

        let index = 0;
        let iterator = await generator.next();
        while (!iterator.done) {
            let val = iterator.value as T;
            for (let transformation of transformations) {
                val = await transformation(val, index);
            }

            if (val != null && val != undefined) {
                res.push(val);
            }

            iterator = await generator.next();
            index++;
        }

        return res;
    }

    private _isGenerator(elm: any): boolean {
        return typeof elm.next === "function";
    }
}

export class ReduceAsyncGeneratorCollector<T = any | null>
    implements IAsyncGeneratorCollector<T | null>
{
    private _reducer: (elm: any) => any;

    constructor(
        reducer: (accumulator: any, currentValue: any, index: number) => any,
        initialValue: any = undefined
    ) {
        let currentValue = null;
        let accumulator = initialValue ?? undefined;
        let index = 0;

        const func = (elm: any) => {
            if (accumulator === undefined) {
                accumulator = elm;
                return accumulator;
            }

            currentValue = elm;
            accumulator = reducer(accumulator, currentValue, index);
            return accumulator;
        };

        this._reducer = func;
    }

    async collect(
        generator: AsyncGenerator<unknown, any, unknown>,
        transformations: ((elm: any, index: number) => any)[]
    ): Promise<T | null> {
        let accumulator = null;

        let index = 0;
        let iterator = await generator.next();
        while (!iterator.done) {
            let val = iterator.value as T | undefined;

            for (let transformation of transformations) {
                try {
                    val = await transformation(val, index);
                } catch {
                    val = undefined;
                }
            }

            if (val != null && val != undefined) {
                if (Array.isArray(val)) {
                    for (let elm of val) {
                        accumulator = this._reducer(elm);
                    }
                } else {
                    accumulator = this._reducer(val);
                }
            }

            iterator = await generator.next();
            index++;
        }

        return accumulator;
    }
}

export class AsyncGeneratorCollectors {
    static toArray(): ArrayAsyncGeneratorCollector {
        return new ArrayAsyncGeneratorCollector();
    }

    static withReducer(
        reducer: (accumulator: any, currentValue: any, index: number) => any,
        initialValue: any = undefined
    ): ReduceAsyncGeneratorCollector {
        return new ReduceAsyncGeneratorCollector(reducer, initialValue);
    }
}
