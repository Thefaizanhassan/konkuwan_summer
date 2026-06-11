import { Link } from 'react-router-dom';
import placeholderImg from '../../assets/hero.png';
import { resolveImageUrl } from '../../lib/imageUrl';

export default function ProductCard({ product }) {
  const primaryImage = product.primary_image || product.images?.[0];
//   const imageUrl = primaryImage?.url || placeholderImg;
  const imageUrl = resolveImageUrl(primaryImage?.url) || placeholderImg;

  return (
    <article className="bg-white border border-border hover:bg-cream transition-colors group cursor-pointer overflow-hidden">
      <div className="aspect-[4/3] overflow-hidden bg-cream-dark">
        <img
          src={imageUrl}
          alt={primaryImage?.alt_text || product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-5">
        <p className="text-xs italic text-muted font-display">{product.botanical_name}</p>
        <h3 className="font-display text-xl text-forest mt-1">{product.name}</h3>
        <p className="text-sm text-muted mt-1">{product.forms}</p>

        <div className="flex gap-2 mt-3 flex-wrap">
          {product.Categories?.map((cat) => (
            <span key={cat.id} className="text-xs px-2 py-0.5 bg-cream-dark text-forest-mid rounded-sm">
              {cat.name}
            </span>
          ))}
        </div>

        <Link
          to="/contact"
          className="mt-4 inline-flex items-center gap-1 text-sage font-medium text-sm group-hover:gap-2 transition-all"
        >
          {product.price_min != null
            ? `₹${product.price_min} – ₹${product.price_max} / ${product.unit}`
            : 'Inquire for pricing →'}
        </Link>
      </div>
    </article>
  );
}

// import { Link } from 'react-router-dom';
// import { render, screen } from '@testing-library/react';
// import { BrowserRouter } from 'react-router-dom';
// import placeholderImg from '../../assets/hero.png';

// const mockProduct = {
//   id: '1',
//   name: 'Dry Ginger',
//   botanical_name: 'Zingiber officinale',
//   price_min: 120,
//   price_max: 180,
//   unit: 'kg',
//   images: [
//     {
//       url: 'https://www.konkuwanherbs.com/images/dry-ginger.jpg',
//       is_primary: true,
//     },
//   ],
// };

// test('renders product name and price range', () => {
//   render(
//     <BrowserRouter>
//       <ProductCard product={mockProduct} />
//     </BrowserRouter>
//   );

//   expect(screen.getByText('Dry Ginger')).toBeInTheDocument();
//   expect(screen.getByText(/₹120 – ₹180/)).toBeInTheDocument();
// });

// export default function ProductCard({ product }) {
//   const primaryImage =
//     product.primary_image || product.images?.[0];

//   const imageUrl =
//     primaryImage?.url || placeholderImg;

//   return (
//     <article className="bg-white border border-border hover:bg-cream transition-colors group cursor-pointer overflow-hidden">
//       <div className="aspect-[4/3] overflow-hidden bg-cream-dark">
//         <img
//           src={imageUrl}
//           alt={primaryImage?.alt_text || product.name}
//           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
//         />
//       </div>

//       <div className="p-5">
//         <p className="text-xs italic text-muted font-display">
//           {product.botanical_name}
//         </p>

//         <h3 className="font-display text-xl text-forest mt-1">
//           {product.name}
//         </h3>

//         <p className="text-sm text-muted mt-1">
//           {product.forms}
//         </p>

//         <div className="flex gap-2 mt-3 flex-wrap">
//           {product.Categories?.map((cat) => (
//             <span
//               key={cat.id}
//               className="text-xs px-2 py-0.5 bg-cream-dark text-forest-mid rounded-sm"
//             >
//               {cat.name}
//             </span>
//           ))}
//         </div>

//         <Link
//           to="/contact"
//           className="mt-4 inline-flex items-center gap-1 text-sage font-medium text-sm group-hover:gap-2 transition-all"
//         >
//           {product.price_min != null
//             ? `₹${product.price_min} – ₹${product.price_max} / ${product.unit}`
//             : 'Inquire for pricing →'}
//         </Link>
//       </div>
//     </article>
//   );
// }