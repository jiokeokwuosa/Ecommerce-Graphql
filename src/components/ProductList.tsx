import Link from "next/link";
import { Product } from "../lib/products";
import { ProductItem } from "./ProductItem";

export function ProductList({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-flow-row-dense grid-cols-1 md:grid-cols-2">
      {products.map((product, index) => (
        <ProductLink key={index} product={product} />
      ))}
    </ul>
  );
}

export function ProductLink({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} key={product.slug} className="bg-gray-400 h-[500px]">
        <ProductItem product={product} />
    </Link>
  );
}