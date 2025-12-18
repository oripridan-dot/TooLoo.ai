/**
 * @file Lightweight branded types for Genesis
 * @version 1.0.0
 */

export type Brand<TBase, TBrand extends string> = TBase & { readonly __brand: TBrand };

export function asBrand<TBase, TBrand extends string>(value: TBase): Brand<TBase, TBrand> {
  return value as Brand<TBase, TBrand>;
}
