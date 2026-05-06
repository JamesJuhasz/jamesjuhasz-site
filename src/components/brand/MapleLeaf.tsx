import Image from "next/image";

const LEAF_SRC = "/images/brand/maple-leaf.png";
const LEAF_RATIO = 534 / 488;

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function MapleLeaf({ size = 60, className, priority = false }: Props) {
  const height = Math.round(size * LEAF_RATIO);
  return (
    <Image
      src={LEAF_SRC}
      width={size}
      height={height}
      alt="Canadian maple leaf"
      className={className}
      priority={priority}
    />
  );
}

export const MAPLE_LEAF_SRC = LEAF_SRC;
