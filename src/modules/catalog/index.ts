// Public API of the catalog module (docs/01): categories, attribute sets, brands and documents.
// Products and variants follow once ADR 0006 (own collections or the ecommerce plugin) is agreed.
export { AttributeSets } from './collections/AttributeSets'
export { Brands } from './collections/Brands'
export { Categories, MAX_CATEGORY_DEPTH } from './collections/Categories'
export { ProductDocuments } from './collections/ProductDocuments'
export { ATTRIBUTE_TYPES, DOCUMENT_TYPES, MAX_VARIANT_AXES } from './constants'
export { attributeSetProblems, optionValueFrom } from './services/attributeSets'
