// Public API of the catalog module (docs/01): categories, attribute sets, brands, documents,
// products and variants (our own collections, ADR 0006).
export { AttributeSets } from './collections/AttributeSets'
export { Brands } from './collections/Brands'
export { Categories } from './collections/Categories'
export { ProductDocuments } from './collections/ProductDocuments'
export { ATTRIBUTE_TYPES, DOCUMENT_TYPES, MAX_CATEGORY_DEPTH, MAX_VARIANT_AXES } from './constants'
export { attributeSetProblems, optionValueFrom } from './services/attributeSets'
export { Products } from './collections/Products'
export { Variants } from './collections/Variants'
export { catalogEndpoints } from './endpoints'
export { attributeSetForCategory } from './services/catalogLookup'
export {
  combinations,
  productAttributeProblems,
  variantAxes,
  variantSku,
  variantTitle,
  type Attribute,
  type VariantAxis,
} from './services/productAttributes'
export { axesForProduct, generateVariants } from './services/variants'
export { GST_RATES, PURCHASE_MODES, type PurchaseMode } from './constants'
export {
  productFiltersFrom,
  productRows,
  productsWhere,
  storeCategories,
  type ProductFilters,
  type ProductRow,
} from './services/productList'
export { categoryTree, type TreeNode } from './services/categoryTree'
