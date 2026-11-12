export function lessonPrice(
  monthlyPrice: number,
  discount: number,
  count: number,
  index: number,
): number {
  if (
    !Number.isSafeInteger(monthlyPrice) ||
    monthlyPrice < 0 ||
    discount < 0 ||
    discount > 100 ||
    !Number.isInteger(count) ||
    count < 1 ||
    index < 0 ||
    index >= count
  )
    throw new Error("Dars narxi parametrlari noto‘g‘ri");
  const total = Math.round((monthlyPrice * (100 - discount)) / 100);
  return Math.floor(total / count) + (index < total % count ? 1 : 0);
}
