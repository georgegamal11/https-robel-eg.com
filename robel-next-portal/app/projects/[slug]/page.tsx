import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getProject } from '@/lib/db';

export const runtime = 'edge'; // Enable Edge Runtime

interface PageProps {
    params: { slug: string };
}

// 1. Dynamic Metadata API for SEO ---------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const project = await getProject(params.slug);

    if (!project) return { title: 'Project Not Found' };

    return {
        title: `${project.name} | Robel Real Estate`,
        description: project.description,
        openGraph: {
            type: 'website',
            url: `https://robel-eg.com/projects/${params.slug}`,
            images: [{ url: project.hero_image, width: 1200, height: 630, alt: project.name }],
        },
        alternates: {
            canonical: `https://robel-eg.com/projects/${params.slug}`,
        }
    };
}

// 2. SSG for Critical Pages (Build Time Generation) ----------------
export async function generateStaticParams() {
    return [
        { slug: 'porto-golf-marina' },
        { slug: 'porto-said' },
    ];
}

// 3. Server Component (No 'use client') ---------------------------
export default async function ProjectPage({ params }: PageProps) {
    const project = await getProject(params.slug);

    if (!project) notFound();

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            {/* Hero Section with Priority Loading */}
            <section className="relative h-[60vh] w-full overflow-hidden">
                <Image
                    src={project.hero_image}
                    alt={project.name}
                    fill
                    priority // Critical for LCP
                    sizes="100vw"
                    quality={85}
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 text-white max-w-4xl">
                    <h1 className="text-5xl font-bold mb-4">{project.name}</h1>
                    <p className="text-xl opacity-90">{project.description}</p>
                </div>
            </section>

            {/* Information Grid */}
            <section className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold mb-4 text-slate-800">Key Features</h2>
                            <ul className="grid grid-cols-2 gap-4">
                                {project.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-gray-600">
                                        <span className="w-2 h-2 bg-primary rounded-full" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Sticky Sidebar */}
                    <div className="relative">
                        <div className="sticky top-24 bg-white p-6 rounded-2xl shadow-lg border border-primary/10">
                            <h3 className="text-xl font-bold mb-4">Interested?</h3>
                            <p className="text-sm text-gray-500 mb-6">Contact our sales team for available units in {project.name}.</p>
                            <button className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors">
                                View Available Units
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
