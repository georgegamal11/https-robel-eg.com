import Link from 'next/link';

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl px-6 lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4">
                    Robel Real Estate Portal &nbsp;
                    <code className="font-mono font-bold">Next.js + D1 + R2</code>
                </p>
            </div>

            <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-2 lg:text-left gap-4">
                <Link
                    href="/projects/porto-golf-marina"
                    className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
                >
                    <h2 className={`mb-3 text-2xl font-semibold`}>
                        Projects{' '}
                        <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                            -&gt;
                        </span>
                    </h2>
                    <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
                        Explore luxury projects with Dynamic Metadata & SSG.
                    </p>
                </Link>
                <Link
                    href="/units"
                    className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
                >
                    <h2 className={`mb-3 text-2xl font-semibold`}>
                        Search Units{' '}
                        <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                            -&gt;
                        </span>
                    </h2>
                    <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
                        Advanced filtering with Server Actions & D1 Indexing.
                    </p>
                </Link>
            </div>
        </main>
    );
}
