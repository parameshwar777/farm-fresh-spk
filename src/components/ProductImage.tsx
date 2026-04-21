import type { Product } from "@/integrations/supabase/client";

type Props = {
  product: Pick<Product, "emoji" | "image_url" | "use_real_image" | "name">;
  className?: string;
  emojiClassName?: string;
  rounded?: "full" | "xl" | "2xl" | "3xl";
};

/**
 * Renders either the product's uploaded photo (when `use_real_image` is on
 * and an image_url exists) or its emoji fallback.
 *
 * Caller controls the box size via `className` (width/height/bg). The image
 * fills the box with object-cover so faces of the produce stay centered.
 */
export function ProductImage({
  product,
  className = "",
  emojiClassName = "text-3xl",
  rounded = "full",
}: Props) {
  const radiusClass =
    rounded === "full"
      ? "rounded-full"
      : rounded === "xl"
        ? "rounded-xl"
        : rounded === "2xl"
          ? "rounded-2xl"
          : "rounded-3xl";

  const showImage = product.use_real_image && !!product.image_url;

  return (
    <div className={`relative overflow-hidden ${radiusClass} ${className}`}>
      {showImage ? (
        <img
          src={product.image_url ?? ""}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className={emojiClassName}>{product.emoji}</span>
        </div>
      )}
    </div>
  );
}
