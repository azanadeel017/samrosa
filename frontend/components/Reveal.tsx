import type { ReactNode, CSSProperties } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function Reveal({
  children,
  delay = 0,
  className = "",
}: RevealProps) {
  const style = { ["--rise-delay" as string]: `${delay}ms` } as CSSProperties;
  return (
    <div className={`rise ${className}`} style={style}>
      {children}
    </div>
  );
}
