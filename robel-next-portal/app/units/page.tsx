import Image from 'next/image';
import Link from 'next/link';
import { getUnits } from '@/lib/db';
import { Suspense } from 'react';

export const runtime = 'edge'; // Enable Edge Runtime

export default async function UnitsPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
    // 1. Parse Filters
    const filters: Record<string, string> = {};
    if (searchParams.min_price) filters.min_price = searchParams.min_price;
    if (searchParams.bedrooms) filters.bedrooms = searchParams.bedrooms;

    // 2. Fetch Data (Server-Side)
    // This runs on the Edge, close to the user.
    const units = await getUnits(filters);

    return (
        <div className="bg-bg-soft min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6 text-navy-deep">Available Units</h1>

                {/* Simple Filter UI (To be improved) */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-8 flex gap-4">
                    <Link href="/units" className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">All</Link>
                    <Link href="/units?bedrooms=2" className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">2 Bedrooms</Link>
                    <Link href="/units?bedrooms=3" className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">3 Bedrooms</Link>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {units.length > 0 ? (
                        units.map((unit: any) => (
                            <div key={unit.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                                <div className="relative h-64 bg-gray-200">
                                    {/* Image Placeholder or Real Image */}
                                    <Image
                                        src={unit.images && unit.images[0] ? unit.images[0] : 'https://placehold.co/600x400?text=No+Image'}
                                        alt={`Unit ${unit.unit_code}`}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                        {unit.status}
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-navy-deep">{unit.unit_code}</h3>
                                            <p className="text-secondary text-sm">Building {unit.building_id || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-primary">{unit.price?.toLocaleString()} EGP</p>
                                            <p className="text-xs text-gray-500">Starting Price</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 mb-6">
                                        <div className="text-center">
                                            <i className="fas fa-ruler-combined text-gray-400 mb-1 block"></i>
                                            <span className="font-semibold text-navy-deep">{unit.area} m²</span>
                                        </div>
                                        <div className="text-center border-l border-gray-100">
                                            <i className="fas fa-bed text-gray-400 mb-1 block"></i>
                                            <span className="font-semibold text-navy-deep">{unit.bedrooms} Beds</span>
                                        </div>
                                        <div className="text-center border-l border-gray-100">
                                            <i className="fas fa-bath text-gray-400 mb-1 block"></i>
                                            <span className="font-semibold text-navy-deep">{unit.bathrooms} Baths</span>
                                        </div>
                                    </div>

                                    <Link href={`/units/${unit.id}`} className="block w-full text-center bg-navy-deep text-white py-3 rounded-lg font-medium hover:bg-navy-light transition-colors">
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <p className="text-gray-500 text-lg">No units found matching your criteria.</p>
                            <Link href="/units" className="text-primary hover:underline mt-2 inline-block">Clear Filters</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
