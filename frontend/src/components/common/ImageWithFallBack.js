const { default: Image } = require("next/image");
const { useEffect, useState } = require("react");

const fallbackImage = "/placeholder.png";

const sanitizeSrc = (src) => {
  if (!src || typeof src !== "string") return fallbackImage;
  const trimmed = src.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return fallbackImage;

  const apiBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.farmacykart.com/api"
  ).replace(/\/api\/?$/, "");

  if (
    trimmed.includes("localhost:8092") ||
    trimmed.includes("127.0.0.1:8092") ||
    trimmed.includes("localhost:5000") ||
    trimmed.includes("127.0.0.1:5000")
  ) {
    return trimmed.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1):(8092|5000)/i,
      apiBase
    );
  }

  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("/logo/")) {
    return `${apiBase}${trimmed}`;
  }

  return trimmed;
};

const ImageWithFallback = ({
  fallback = fallbackImage,
  alt,
  src,
  style = {},
  className = "",
  ...props
}) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
  }, [src]);

  // prefer explicit objectFit from caller (style.objectFit), otherwise default to cover
  const objectFit = style.objectFit || "cover";

  // If caller provided explicit width & height, render an intrinsic image (no fill)
  const hasSize = props.width && props.height;
  const imageSrc = error ? fallback : sanitizeSrc(src);

  if (hasSize) {
    const { width, height, ...rest } = props;
    return (
      <Image
        alt={alt}
        onError={setError}
        src={imageSrc}
        width={width}
        height={height}
        {...rest}
        style={{ objectFit, ...style }}
        sizes="100vw"
        className={`${className} transition-transform duration-500 ease-out transform group-hover:scale-105`}
      />
    );
  }

  return (
    <Image
      alt={alt}
      onError={setError}
      src={imageSrc}
      {...props}
      fill
      style={{
        objectFit,
        ...style,
      }}
      sizes="100vw"
      className={`${className} transition-transform duration-500 ease-out transform group-hover:scale-105`}
    />
  );
};

export default ImageWithFallback;
