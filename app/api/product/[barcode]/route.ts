import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params;
  if (!barcode || barcode.length < 5) {
    return NextResponse.json({ error: 'Invalid barcode' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      return NextResponse.json({ barcode, found: false });
    }

    const data = await response.json();
    const product = data.product;

    if (!product) {
      return NextResponse.json({ barcode, found: false });
    }

    return NextResponse.json({
      found: true,
      name: product.product_name || product.generic_name || 'Noma\'lum mahsulot',
      description: product.product_name_uz || product.generic_name_uz || product.product_name,
      image_url: product.image_url || product.image_front_url,
      brand: product.brands,
      metadata: {
        image_url: product.image_front_url,
        description: product.product_name,
        brand: product.brands,
        nutriscore: product.nutriscore_grade
      }
    });
  } catch (error) {
    console.error('OpenFoodFacts error:', error);
    return NextResponse.json({ barcode, found: false, error: 'API error' });
  }
}

